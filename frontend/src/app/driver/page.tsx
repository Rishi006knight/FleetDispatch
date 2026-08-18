'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Route as RouteIcon, IndianRupee, User, 
  Power, ShieldAlert, CheckCircle2, MapPin, Star,
  DollarSign, Upload, AlertCircle, ChevronRight, 
  Play, Square, Award, Warehouse, FileText, 
  ShieldCheck, Box, Radio, Check, X, Bell, Truck, Navigation
} from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';
import dynamic from 'next/dynamic';

const TrackingMap = dynamic(() => import('../components/Map'), { ssr: false });
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function DriverPortal() {
  const router = useRouter();

  // Navigation tab
  const [activeNav, setActiveNav] = useState<'dashboard' | 'trips' | 'earnings' | 'profile'>('dashboard');

  // Driver identity states
  const [driver, setDriver] = useState<any | null>(null);
  const [driverId, setDriverId] = useState('');
  const [driverUnit, setDriverUnit] = useState('');
  const [rtoCode, setRtoCode] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [stationHub, setStationHub] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  // Operational states
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [pendingDispatchRequest, setPendingDispatchRequest] = useState<any | null>(null);
  const [respondingDispatch, setRespondingDispatch] = useState(false);

  // Stepper / Delivery states
  const [tripStep, setTripStep] = useState<'pickup' | 'transit' | 'pod'>('pickup');
  const [podPhoto, setPodPhoto] = useState<string>('');
  const [podUploading, setPodUploading] = useState(false);

  // Simulated live driving movement
  const [isDriving, setIsDriving] = useState(false);
  const [driveIndex, setDriveIndex] = useState(0);
  const driveTimerRef = useRef<any>(null);
  const socketRef = useRef<any>(null);

  // Count-up animated stats values
  const [animatedEarnings, setAnimatedEarnings] = useState(0);
  const [animatedTrips, setAnimatedTrips] = useState(0);
  const [animatedRating, setAnimatedRating] = useState(0);
  const [animatedReliability, setAnimatedReliability] = useState(0);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    const storedDriverId = localStorage.getItem('driver_id') || '';
    const storedUnit = localStorage.getItem('driver_unit') || '';
    const storedRto = localStorage.getItem('rto_code') || '';
    const storedVeh = localStorage.getItem('vehicle_id') || '';
    const storedName = localStorage.getItem('user_name') || 'Heavy Truck Driver';
    const storedHub = localStorage.getItem('driver_hub') || 'Logistics Center';

    if (role !== 'driver') {
      router.push('/');
      return;
    }

    setDriverId(storedDriverId);
    setDriverUnit(storedUnit);
    setRtoCode(storedRto);
    setVehicleId(storedVeh);
    setDriverName(storedName);
    setStationHub(storedHub);

    // Animate KPI numbers
    const targetEarnings = 48500;
    const targetTrips = 64;
    const targetRating = 4.92;
    const targetReliability = 98;

    const duration = 1500;
    const startTime = performance.now();

    const animateKPIs = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // cubic ease out

      setAnimatedEarnings(Math.round(ease * targetEarnings));
      setAnimatedTrips(Math.round(ease * targetTrips));
      setAnimatedRating(parseFloat((ease * targetRating).toFixed(2)));
      setAnimatedReliability(Math.round(ease * targetReliability));

      if (progress < 1) {
        requestAnimationFrame(animateKPIs);
      }
    };
    requestAnimationFrame(animateKPIs);

    // Socket setup
    socketRef.current = io(API_URL);
    
    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_room', storedDriverId);
    });

    socketRef.current.on('ORDER_DISPATCH_REQUEST', ({ order, driver: targetDriver }: any) => {
      if (targetDriver?.driverId === storedDriverId || order?.dispatchRequestedDriverId === storedDriverId) {
        setPendingDispatchRequest(order);
      }
    });

    socketRef.current.on('ORDER_ASSIGNED', ({ order, driver: updatedDriver }: any) => {
      if (updatedDriver?.driverId === storedDriverId || order?.driverId === storedDriverId) {
        setDriver(updatedDriver || ((prev: any) => ({ ...prev, status: 'busy' })));
        setActiveOrder(order);
        setPendingDispatchRequest(null);
      }
    });

    socketRef.current.on('ORDER_STATUS_UPDATED', (order: any) => {
      if (activeOrder && activeOrder.orderId === order.orderId) {
        setActiveOrder(order);
      }
    });

    fetchDriverProfile(storedDriverId);

    return () => {
      if (driveTimerRef.current) clearInterval(driveTimerRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const fetchDriverProfile = async (id: string) => {
    try {
      const res = await axios.get(`${API_URL}/api/drivers`);
      const matched = res.data.find((d: any) => d.driverId === id || d.vehicleId === vehicleId);
      if (matched) {
        setDriver(matched);
        setIsOnline(matched.status === 'online');
        
        const ordersRes = await axios.get(`${API_URL}/api/orders`);
        const active = ordersRes.data.find((o: any) => (o.driverId === matched.driverId || o.driverId === id) && !['completed', 'failed', 'rejected'].includes(o.status));
        if (active) {
          setActiveOrder(active);
        }

        const pending = ordersRes.data.find((o: any) => o.status === 'dispatch_requested' && (o.dispatchRequestedDriverId === matched.driverId || o.dispatchRequestedDriverId === id));
        if (pending) {
          setPendingDispatchRequest(pending);
        }
      } else {
        setDriver({
          driverId: id,
          name: driverName,
          vehicleId,
          status: 'online',
          currentLocation: { lat: 13.0844, lng: 80.2936 }
        });
      }
    } catch (err) {
      setDriver({
        driverId: id,
        name: driverName,
        vehicleId,
        status: 'online',
        currentLocation: { lat: 13.0844, lng: 80.2936 }
      });
    }
  };

  const handleToggleOnlineStatus = async () => {
    const nextStatus = isOnline ? 'offline' : 'online';
    setIsOnline(!isOnline);
    try {
      if (driver) {
        await axios.put(`${API_URL}/api/drivers/${driver.driverId}/status`, { status: nextStatus });
      }
    } catch (err) {
      // local toggle fallback
    }
  };

  // Accept or Decline Dispatch Request
  const handleDriverDecision = async (decision: 'accept' | 'decline') => {
    if (!pendingDispatchRequest || !driver) return;
    setRespondingDispatch(true);

    try {
      const res = await axios.post(`${API_URL}/api/drivers/dispatch-response`, {
        orderId: pendingDispatchRequest.orderId,
        driverId: driver.driverId,
        decision
      });

      if (decision === 'accept') {
        setActiveOrder(res.data.order || pendingDispatchRequest);
        setPendingDispatchRequest(null);
      } else {
        setPendingDispatchRequest(null);
      }
    } catch (err) {
      if (decision === 'accept') {
        setActiveOrder(pendingDispatchRequest);
        setPendingDispatchRequest(null);
      } else {
        setPendingDispatchRequest(null);
      }
    } finally {
      setRespondingDispatch(false);
    }
  };

  // Start Highway Transit Simulation
  const handleStartTransit = () => {
    if (!activeOrder) return;
    setIsDriving(true);
    setTripStep('transit');

    // Simulate GPS movement along route
    const startLat = activeOrder.pickup?.lat || 13.0844;
    const startLng = activeOrder.pickup?.lng || 80.2936;
    const endLat = activeOrder.drop?.lat || 12.7409;
    const endLng = activeOrder.drop?.lng || 77.8253;

    let step = 0;
    const totalSteps = 20;

    driveTimerRef.current = setInterval(() => {
      step++;
      const currentLat = startLat + (endLat - startLat) * (step / totalSteps);
      const currentLng = startLng + (endLng - startLng) * (step / totalSteps);

      // Emit telemetry to tower
      if (socketRef.current) {
        socketRef.current.emit('update_telemetry', {
          driverId: driver?.driverId || driverId,
          orderId: activeOrder.orderId,
          location: { lat: currentLat, lng: currentLng },
          speed: 55 + Math.random() * 10
        });
      }

      setDriver((prev: any) => prev ? { ...prev, currentLocation: { lat: currentLat, lng: currentLng } } : prev);

      if (step >= totalSteps) {
        clearInterval(driveTimerRef.current);
        setIsDriving(false);
        setTripStep('pod');
      }
    }, 1500);
  };

  // Complete Consignment Delivery & POD
  const handleCompleteDelivery = async () => {
    if (!activeOrder) return;
    setPodUploading(true);

    try {
      await axios.put(`${API_URL}/api/orders/${activeOrder.orderId}/complete`, {
        podNotes: 'Signed by destination warehouse yard manager. Seal intact.'
      });
      setActiveOrder(null);
      setTripStep('pickup');
      setPodPhoto('');
    } catch (err) {
      setActiveOrder(null);
      setTripStep('pickup');
    } finally {
      setPodUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fb] text-[#1a1d23] font-sans antialiased">
      
      {/* ==================================================================== */}
      {/* SIDEBAR: Desktop 240px Fixed Sidebar                                 */}
      {/* ==================================================================== */}
      <aside className="w-[240px] fixed inset-y-0 left-0 bg-white border-r border-black/[0.06] shadow-[2px_0_12px_rgba(0,0,0,0.03)] flex flex-col justify-between z-20">
        
        {/* Top Section */}
        <div>
          <div className="p-5 pb-4">
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold tracking-tight text-[#1a1d23]">QUANTUM</span>
              <span className="text-lg font-bold tracking-tight text-[#e67e22]">EXPRESS</span>
            </div>
            <div className="text-[10px] text-[#9ca3af] font-medium mt-0.5">
              Heavy Truck Driver Portal
            </div>
          </div>

          <div className="h-[1px] bg-black/[0.06] mx-4"></div>

          {/* Driver Identity Block */}
          <div className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#1a1d23] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#e67e22]" />
                {vehicleId}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#e67e22]/10 text-[#e67e22] text-[10px] font-mono font-bold">
                TN-{rtoCode}
              </span>
            </div>
            <div className="text-xs font-semibold text-[#5a6070]">
              Driver #{driverUnit}
            </div>
            <div className="text-[11px] text-[#9ca3af] leading-tight line-clamp-2">
              {stationHub}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1 mt-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'trips', label: 'My Trips', icon: RouteIcon },
              { id: 'earnings', label: 'Earnings', icon: IndianRupee },
              { id: 'profile', label: 'Profile', icon: User },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id as any)}
                  className={`w-full h-10 px-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[#e67e22]/10 text-[#e67e22] border-l-[3px] border-[#e67e22]' 
                      : 'text-[#5a6070] hover:bg-[#f1f3f6] hover:text-[#1a1d23]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#e67e22]' : 'text-[#9ca3af]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-black/[0.06]">
          <button
            onClick={handleLogout}
            className="w-full h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-[#5a6070] hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Go Offline / Exit</span>
          </button>
        </div>

      </aside>

      {/* ==================================================================== */}
      {/* MAIN CONTENT AREA: calc(100vw - 240px)                              */}
      {/* ==================================================================== */}
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen">
        
        {/* Sticky Top Bar */}
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-black/[0.06] px-8 py-4 flex items-center justify-between shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-[#1a1d23]">Driver Dashboard</h1>
            <p className="text-xs text-[#5a6070] mt-0.5">
              Live Station Terminal Status & Highway Freight Assignment
            </p>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Segmented Online/Offline Pill Toggle (80px x 36px) */}
            <button
              onClick={handleToggleOnlineStatus}
              className={`relative h-9 px-3.5 rounded-full flex items-center gap-2 text-xs font-bold text-white transition-all duration-400 cursor-pointer shadow-sm ${
                isOnline 
                  ? 'bg-[#10b981] shadow-emerald-500/30' 
                  : 'bg-[#6b7280]'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  <span>Online</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                  <span>Offline</span>
                </>
              )}
            </button>

            {/* Notification Bell */}
            <div className="relative p-2 rounded-lg bg-[#f1f3f6] text-[#5a6070] cursor-pointer hover:text-[#1a1d23] transition-colors">
              <Bell className="w-4 h-4" />
              {pendingDispatchRequest && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#e67e22] animate-ping"></span>
              )}
            </div>

          </div>
        </header>

        {/* Page Content */}
        <main className="p-8 space-y-6 flex-1">
          
          {/* ================================================================ */}
          {/* KPI STATS ROW (4 Equal Cards Across)                             */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            
            {/* Card 1: Total Freight Earnings */}
            <div className="qe-card qe-card-hover p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#e67e22]/10 flex items-center justify-center text-[#e67e22] shrink-0">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af] block">
                  Freight Earnings
                </span>
                <span className="text-2xl font-bold text-[#e67e22]">
                  ₹{animatedEarnings.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                  +₹4,200 this week
                </span>
              </div>
            </div>

            {/* Card 2: Completed Trips */}
            <div className="qe-card qe-card-hover p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#e67e22]/10 flex items-center justify-center text-[#e67e22] shrink-0">
                <RouteIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af] block">
                  Completed Trips
                </span>
                <span className="text-2xl font-bold text-[#1a1d23]">
                  {animatedTrips}
                </span>
                <span className="text-[10px] text-[#9ca3af] font-semibold block mt-0.5">
                  Heavy Cargo Loads
                </span>
              </div>
            </div>

            {/* Card 3: Commercial Rating */}
            <div className="qe-card qe-card-hover p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#e67e22]/10 flex items-center justify-center text-[#e67e22] shrink-0">
                <Star className="w-6 h-6 fill-[#e67e22]" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af] block">
                  Commercial Rating
                </span>
                <span className="text-2xl font-bold text-[#1a1d23] flex items-center gap-1 text-shadow-sm">
                  ★ {animatedRating.toFixed(2)}
                </span>
                <span className="text-[10px] text-[#9ca3af] font-semibold block mt-0.5">
                  Top 5% State Driver
                </span>
              </div>
            </div>

            {/* Card 4: Reliability Score with Circular SVG Ring */}
            <div className="qe-card qe-card-hover p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af] block">
                  Reliability Score
                </span>
                <span className="text-xs font-bold text-emerald-600 block mt-1">
                  On-Time SLA: 98%
                </span>
                <span className="text-[10px] text-[#9ca3af] block mt-0.5">
                  Zero Damaged Cargo
                </span>
              </div>

              {/* 64px Circular Progress Ring */}
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  {/* Track */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#f1f3f6"
                    strokeWidth="3.5"
                  />
                  {/* Fill */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeDasharray="98, 100"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xs font-bold text-[#1a1d23]">
                  {animatedReliability}%
                </span>
              </div>
            </div>

          </div>

          {/* ================================================================ */}
          {/* DRIVER STATUS / WAITING / LOAD OFFER AREA                         */}
          {/* ================================================================ */}

          {/* STATE 1: PENDING DISPATCH OFFER ARRIVED */}
          {pendingDispatchRequest && (
            <div className="qe-card border-2 border-[#e67e22] p-7 bg-gradient-to-r from-amber-500/[0.04] to-white animate-in slide-in-from-bottom-3 duration-400">
              <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#e67e22] text-white flex items-center justify-center animate-bounce">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1a1d23]">
                      Immediate Freight Dispatch Offer!
                    </h2>
                    <span className="text-xs text-[#5a6070]">
                      Control Tower requesting your station truck for high-priority consignment
                    </span>
                  </div>
                </div>

                <span className="font-mono text-xs font-bold text-[#e67e22] bg-[#e67e22]/10 px-3 py-1 rounded-full">
                  Order #{pendingDispatchRequest.orderId}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-5">
                <div className="bg-white p-3.5 rounded-xl border border-black/[0.06]">
                  <span className="text-[10px] uppercase font-bold text-[#9ca3af] block">Origin Hub</span>
                  <span className="text-xs font-bold text-[#1a1d23]">{pendingDispatchRequest.pickup?.address?.split(',')[0]}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-black/[0.06]">
                  <span className="text-[10px] uppercase font-bold text-[#9ca3af] block">Destination Terminal</span>
                  <span className="text-xs font-bold text-[#1a1d23]">{pendingDispatchRequest.drop?.address?.split(',')[0]}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-black/[0.06]">
                  <span className="text-[10px] uppercase font-bold text-[#9ca3af] block">Cargo Commodity</span>
                  <span className="text-xs font-bold text-[#1a1d23]">{pendingDispatchRequest.packageDetails?.type || pendingDispatchRequest.package?.type || 'Heavy Machinery & Cargo'}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-black/[0.06]">
                  <span className="text-[10px] uppercase font-bold text-[#9ca3af] block">Trip Payout</span>
                  <span className="text-base font-bold text-[#e67e22]">₹{Math.round(pendingDispatchRequest.totalBillAmount || pendingDispatchRequest.price || 24500).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  disabled={respondingDispatch}
                  onClick={() => handleDriverDecision('decline')}
                  className="flex-1 h-11 rounded-xl bg-white border border-rose-300 text-rose-600 font-bold text-xs hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Decline Load
                </button>
                <button
                  disabled={respondingDispatch}
                  onClick={() => handleDriverDecision('accept')}
                  className="flex-2 h-11 rounded-xl bg-gradient-to-r from-[#e67e22] to-[#f39c12] text-white font-bold text-sm shadow-md hover:shadow-amber-500/35 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept Load & Begin Transit</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE 2: ACTIVE CONSIGNMENT IN TRANSIT */}
          {activeOrder && !pendingDispatchRequest && (
            <div className="qe-card p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
                <div>
                  <span className="text-xs font-semibold text-[#e67e22] uppercase tracking-wider">
                    Active Consignment In Progress
                  </span>
                  <h2 className="text-lg font-bold text-[#1a1d23] mt-0.5">
                    {activeOrder.pickup?.address?.split(',')[0]} ➔ {activeOrder.drop?.address?.split(',')[0]}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    {tripStep === 'pickup' && 'Stationed at Bay'}
                    {tripStep === 'transit' && 'In Highway Transit'}
                    {tripStep === 'pod' && 'Arrived at Destination CFS'}
                  </span>
                </div>
              </div>

              {/* Map & Live Tracker */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8 h-[360px] rounded-xl overflow-hidden border border-black/[0.06] relative">
                  <TrackingMap
                    driverLocation={driver?.currentLocation}
                    pickupLocation={activeOrder.pickup}
                    dropLocation={activeOrder.drop}
                    showWarehouses={true}
                  />
                </div>

                <div className="xl:col-span-4 flex flex-col justify-between space-y-4">
                  
                  <div className="p-4 bg-[#f8f9fb] rounded-xl border border-black/[0.04] space-y-3">
                    <div className="text-xs font-bold text-[#1a1d23] uppercase tracking-wide">
                      Consignment Manifest
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#5a6070]">Order ID:</span>
                        <span className="font-mono font-bold">{activeOrder.orderId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5a6070]">Cargo:</span>
                        <span className="font-semibold">{activeOrder.packageDetails?.type || activeOrder.package?.type || 'Heavy Machinery & Cargo'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5a6070]">Weight:</span>
                        <span className="font-bold">{(((activeOrder.packageDetails?.weight || activeOrder.package?.weight || 12500)) / 1000).toFixed(1)} MT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5a6070]">Trip Earnings:</span>
                        <span className="font-bold text-[#e67e22]">₹{Math.round(activeOrder.totalBillAmount || activeOrder.price || 24500).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions based on Step */}
                  {tripStep === 'pickup' && (
                    <button
                      onClick={handleStartTransit}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-[#e67e22] to-[#f39c12] text-white font-bold text-sm shadow-md hover:shadow-amber-500/35 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Start GPS Transit to Destination</span>
                    </button>
                  )}

                  {tripStep === 'transit' && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-2">
                      <div className="text-xs font-bold text-amber-800 flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#e67e22] animate-ping"></span>
                        Simulating Live Highway GPS Movement...
                      </div>
                      <div className="text-[11px] text-[#5a6070]">
                        Transmitting real-time speed & corridor coordinates to Control Tower
                      </div>
                    </div>
                  )}

                  {tripStep === 'pod' && (
                    <div className="space-y-3">
                      <button
                        onClick={handleCompleteDelivery}
                        disabled={podUploading}
                        className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Yard Delivery & Submit POD</span>
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* STATE 3: STATIONED / WAITING (Radar Ping Animation) */}
          {!activeOrder && !pendingDispatchRequest && (
            <div className="qe-card p-12 text-center relative overflow-hidden min-h-[280px] flex flex-col items-center justify-center border border-[#e67e22]/20">
              
              {/* Concentric Radar Ping Expanding Rings */}
              <div className="relative w-32 h-32 flex items-center justify-center mb-6">
                <div className="absolute inset-0 rounded-full border border-[#e67e22]/30 qe-radar-ring-1"></div>
                <div className="absolute inset-0 rounded-full border border-[#e67e22]/30 qe-radar-ring-2"></div>
                <div className="absolute inset-0 rounded-full border border-[#e67e22]/30 qe-radar-ring-3"></div>
                
                <div className="w-16 h-16 rounded-full bg-[#e67e22]/10 border border-[#e67e22]/30 flex items-center justify-center text-[#e67e22] shadow-lg shadow-amber-500/20">
                  <Radio className="w-8 h-8 animate-pulse" />
                </div>
              </div>

              <h2 className="text-lg font-bold text-[#1a1d23]">
                Stationed at Source Terminal ({stationHub})
              </h2>
              <p className="text-xs text-[#5a6070] mt-2 max-w-lg leading-relaxed">
                Remain online at your source hub. When goods are ready for dispatch, the control tower will send an immediate load offer directly to your screen.
              </p>

            </div>
          )}

          {/* ================================================================ */}
          {/* DESKTOP DETAIL PANELS: Recent Trip History                        */}
          {/* ================================================================ */}
          <div className="qe-card overflow-hidden">
            <div className="p-5 border-b border-black/[0.06] flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1a1d23]">
                Recent Delivery Records & Toll Reconciliation
              </h3>
              <span className="text-xs font-semibold text-[#e67e22]">64 Total Loads</span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-[#f1f3f6] text-[#5a6070] uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3.5">Trip ID</th>
                  <th className="p-3.5">Corridor Route</th>
                  <th className="p-3.5">Weight (MT)</th>
                  <th className="p-3.5">Earnings</th>
                  <th className="p-3.5">POD Verified</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {[
                  { id: 'TRP-8821', route: 'Chennai Port CFS ➔ Hosur SIPCOT', weight: '18.5 MT', amount: '₹14,500', pod: 'Signed & Sealed', status: 'Completed' },
                  { id: 'TRP-8794', route: 'Kamarajar Ennore ➔ Vellore SIPCOT', weight: '22.0 MT', amount: '₹11,800', pod: 'Signed & Sealed', status: 'Completed' },
                  { id: 'TRP-8750', route: 'Coimbatore Industrial ➔ Tiruppur Export', weight: '12.0 MT', amount: '₹8,200', pod: 'Signed & Sealed', status: 'Completed' },
                  { id: 'TRP-8692', route: 'Salem Steel Plant ➔ Erode Perundurai', weight: '16.0 MT', amount: '₹9,400', pod: 'Signed & Sealed', status: 'Completed' },
                ].map((row, idx) => (
                  <tr key={idx} className="qe-table-row">
                    <td className="p-3.5 font-mono font-bold text-[#1a1d23]">{row.id}</td>
                    <td className="p-3.5 font-medium">{row.route}</td>
                    <td className="p-3.5">{row.weight}</td>
                    <td className="p-3.5 font-bold text-[#e67e22]">{row.amount}</td>
                    <td className="p-3.5 text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {row.pod}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </main>

      </div>

    </div>
  );
}
