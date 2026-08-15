'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, Power, ShieldAlert, CheckCircle2, 
  MapPin, DollarSign, Upload, AlertCircle, 
  ChevronRight, Play, Square, Award, Warehouse, 
  FileText, ShieldCheck, Box, Radio, Check, X, BellRing
} from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';
import dynamic from 'next/dynamic';

const TrackingMap = dynamic(() => import('../components/Map'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function DriverPortal() {
  const router = useRouter();
  const [driver, setDriver] = useState<any | null>(null);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [pendingDispatchRequest, setPendingDispatchRequest] = useState<any | null>(null);
  const [respondingDispatch, setRespondingDispatch] = useState(false);

  // Stepper state
  const [podPhoto, setPodPhoto] = useState<string>('');
  const [podStatus, setPodStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Simulated driving state
  const [isDriving, setIsDriving] = useState(false);
  const [driveIndex, setDriveIndex] = useState(0);
  const driveTimerRef = useRef<any>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    const driverId = localStorage.getItem('driver_id') || 'TRK-01-01';
    
    if (role !== 'driver') {
      router.push('/');
      return;
    }

    // Connect socket
    socketRef.current = io(API_URL);
    
    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_room', driverId);
    });

    // Listen for dispatch request from source dispatcher
    socketRef.current.on('ORDER_DISPATCH_REQUEST', ({ order, driver: targetDriver }: any) => {
      if (targetDriver.driverId === driverId || order.dispatchRequestedDriverId === driverId) {
        setPendingDispatchRequest(order);
      }
    });

    // Listen for direct assignment
    socketRef.current.on('ORDER_ASSIGNED', ({ order, driver: updatedDriver }: any) => {
      if (updatedDriver.driverId === driverId) {
        setDriver(updatedDriver);
        setActiveOrder(order);
        setPendingDispatchRequest(null);
      }
    });

    // Pull driver profile on load
    fetchDriverProfile(driverId);

    return () => {
      if (driveTimerRef.current) clearInterval(driveTimerRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const fetchDriverProfile = async (id: string) => {
    const storedName = localStorage.getItem('user_name') || 'Heavy Truck Driver';
    const storedVehicleId = localStorage.getItem('vehicle_id') || 'TN-01-TR-0001';
    const storedLat = parseFloat(localStorage.getItem('driver_lat') || '13.0844');
    const storedLng = parseFloat(localStorage.getItem('driver_lng') || '80.2936');
    const storedVehicleType = localStorage.getItem('vehicle_type') || '32ft Heavy Trailer';

    try {
      const res = await axios.get(`${API_URL}/api/drivers`);
      const matched = res.data.find((d: any) => d.driverId === id || d.vehicleId === storedVehicleId);
      
      if (matched) {
        setDriver(matched);
        const ordersRes = await axios.get(`${API_URL}/api/orders`);
        
        // Check if there is an active assigned consignment
        const active = ordersRes.data.find((o: any) => (o.driverId === matched.driverId || o.driverId === id) && !['completed', 'failed', 'rejected'].includes(o.status));
        if (active) {
          setActiveOrder(active);
        }

        // Check if there is a pending dispatch request for this driver
        const pending = ordersRes.data.find((o: any) => o.status === 'dispatch_requested' && (o.dispatchRequestedDriverId === matched.driverId || o.dispatchRequestedDriverId === id));
        if (pending) {
          setPendingDispatchRequest(pending);
        }
      } else {
        // Register heavy truck driver dynamically based on RTO
        const regRes = await axios.post(`${API_URL}/api/drivers`, {
          name: storedName,
          phone: '9840112233',
          vehicleId: storedVehicleId,
          vehicleType: storedVehicleType,
          initialLat: storedLat,
          initialLng: storedLng
        });
        setDriver(regRes.data);
      }
    } catch (err) {
      console.warn('Backend loading, setting local heavy truck mock.');
      setDriver({
        driverId: id,
        name: storedName,
        vehicleType: storedVehicleType,
        vehicleId: storedVehicleId,
        status: 'online',
        currentLocation: { lat: storedLat, lng: storedLng },
        rating: 4.92,
        reliability: 0.98,
        earnings: 48500,
        completedDeliveries: 64
      });
    }
  };

  const handleToggleStatus = async () => {
    if (!driver) return;
    const newStatus = driver.status === 'online' ? 'offline' : 'online';
    try {
      const res = await axios.put(`${API_URL}/api/drivers/${driver.driverId}/status`, {
        status: newStatus
      });
      setDriver(res.data);
    } catch (err) {
      setDriver({ ...driver, status: newStatus });
    }
  };

  // Driver accepts or declines the dispatcher's request
  const handleDriverDecision = async (decision: 'accept' | 'decline') => {
    if (!pendingDispatchRequest || !driver) return;
    setRespondingDispatch(true);

    try {
      const res = await axios.post(`${API_URL}/api/orders/${pendingDispatchRequest.orderId}/driver-response`, {
        driverId: driver.driverId,
        decision: decision
      });

      if (decision === 'accept') {
        setActiveOrder(res.data.order);
        setDriver((prev: any) => ({ ...prev, status: 'busy' }));
        setPendingDispatchRequest(null);
      } else {
        setPendingDispatchRequest(null);
      }
    } catch (err) {
      alert('Failed to respond to dispatch request.');
    } finally {
      setRespondingDispatch(false);
    }
  };

  const handleStartTransit = async () => {
    if (!activeOrder) return;
    try {
      const res = await axios.put(`${API_URL}/api/orders/${activeOrder.orderId}/status`, {
        status: 'out_for_delivery'
      });
      setActiveOrder(res.data);
      startLiveGPSDriving(res.data.routeCoordinates || []);
    } catch (err) {
      alert('Error updating freight transit status.');
    }
  };

  const startLiveGPSDriving = (route: Array<{ lat: number; lng: number }>) => {
    if (!route || route.length === 0) return;
    setIsDriving(true);
    let idx = 0;

    driveTimerRef.current = setInterval(async () => {
      if (idx >= route.length) {
        clearInterval(driveTimerRef.current);
        setIsDriving(false);
        return;
      }

      const point = route[idx];
      setDriveIndex(idx);

      try {
        await axios.post(`${API_URL}/api/drivers/${driver.driverId}/telemetry`, {
          lat: point.lat,
          lng: point.lng,
          speed: 62.0, // Commercial Truck highway cruising speed in km/h
          heading: 180,
          activeOrderId: activeOrder?.orderId
        });

        setDriver((prev: any) => ({
          ...prev,
          currentLocation: point
        }));
      } catch (err) {}

      idx++;
    }, 2000);
  };

  const handleCompleteDelivery = async () => {
    if (!activeOrder) return;
    setPodStatus('loading');
    setErrorMessage('');

    try {
      const res = await axios.put(`${API_URL}/api/orders/${activeOrder.orderId}/status`, {
        status: 'completed'
      });

      setPodStatus('success');
      setActiveOrder(res.data);
      if (driveTimerRef.current) clearInterval(driveTimerRef.current);
      setIsDriving(false);
    } catch (err: any) {
      setPodStatus('failed');
      setErrorMessage(err.response?.data?.error || 'Failed to complete shipment.');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 min-h-screen text-zinc-100 font-sans">
      
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
            <Truck className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-white">QUANTUM<span className="text-cyan-400">EXPRESS</span></h1>
              <span className="text-xs font-semibold text-zinc-300 border-l border-zinc-700 pl-2">Commercial Truck Fleet</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                {driver?.vehicleId || 'TN-01-TR-0001'}
              </span>
            </div>
            <span className="text-xs text-zinc-400">{driver?.name || 'Heavy Truck Driver'} • {driver?.vehicleType || 'Heavy Trailer'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleStatus}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
              driver?.status === 'online'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : driver?.status === 'busy'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {driver?.status === 'online' ? 'TRUCK ONLINE' : driver?.status === 'busy' ? 'ON TRANSIT' : 'TRUCK OFFLINE'}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 space-y-6 max-w-5xl w-full mx-auto">
        
        {/* Real-Time Dispatch Request Alert Banner (When Dispatcher sends load request) */}
        {pendingDispatchRequest && (
          <section className="bg-gradient-to-br from-indigo-950/90 via-zinc-900 to-zinc-950 border-2 border-cyan-400/80 rounded-3xl p-6 shadow-2xl shadow-cyan-500/10 space-y-5 animate-pulse">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-500/20 rounded-2xl border border-cyan-500/40">
                  <BellRing className="w-6 h-6 text-cyan-400 animate-bounce" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 block">Immediate Freight Opportunity</span>
                  <h2 className="text-lg font-black text-white">Goods Ready to Dispatch at Source Hub!</h2>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Consignment Value</span>
                <span className="text-xl font-black text-emerald-400">₹{pendingDispatchRequest.price?.toLocaleString()}</span>
              </div>
            </div>

            {/* Consignment Specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-zinc-950/90 rounded-2xl border border-zinc-800 space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold uppercase block">Source Loading Terminal (Pickup)</span>
                <p className="font-bold text-white text-sm">{pendingDispatchRequest.pickup?.address}</p>
                <span className="text-zinc-500 text-[11px] block">Shipper: {pendingDispatchRequest.customerName}</span>
              </div>
              <div className="p-4 bg-zinc-950/90 rounded-2xl border border-zinc-800 space-y-1">
                <span className="text-[10px] text-rose-400 font-bold uppercase block">Destination Hub / CFS (Drop)</span>
                <p className="font-bold text-white text-sm">{pendingDispatchRequest.drop?.address}</p>
                <span className="text-zinc-500 text-[11px] block">Cargo: {pendingDispatchRequest.package?.weight} MT • {pendingDispatchRequest.package?.type}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={() => handleDriverDecision('decline')}
                disabled={respondingDispatch}
                className="flex-1 py-3 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4 text-rose-400" /> Decline Load
              </button>
              <button
                onClick={() => handleDriverDecision('accept')}
                disabled={respondingDispatch}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-4 h-4 text-zinc-950" /> Accept Load & Proceed to Loading Bay
              </button>
            </div>
          </section>
        )}

        {/* Earnings & Stats Strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Total Freight Earnings</span>
            <p className="text-xl font-black text-emerald-400 mt-1">₹{driver?.earnings?.toLocaleString() || '0'}</p>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Completed Trips</span>
            <p className="text-xl font-black text-white mt-1">{driver?.completedDeliveries || 0} Loads</p>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Commercial Rating</span>
            <p className="text-xl font-black text-amber-400 mt-1">★ {driver?.rating || 4.9}</p>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Reliability Score</span>
            <p className="text-xl font-black text-cyan-400 mt-1">{Math.round((driver?.reliability || 0.96) * 100)}%</p>
          </div>
        </section>

        {/* Assigned Consignment Manifest */}
        {activeOrder ? (
          <section className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-xs text-zinc-500 font-mono">MANIFEST ID: {activeOrder.orderId}</span>
                <h2 className="text-lg font-extrabold text-white mt-0.5">{activeOrder.package?.type} ({activeOrder.package?.weight} MT)</h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Consignment Value</span>
                <span className="text-xl font-black text-emerald-400">₹{activeOrder.price?.toLocaleString()}</span>
              </div>
            </div>

            {/* Warehouse Transit Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <span className="text-[10px] text-emerald-400 font-bold uppercase block mb-1">Pickup / Loading Bay</span>
                <p className="font-semibold text-white">{activeOrder.pickup?.address}</p>
              </div>
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <span className="text-[10px] text-rose-400 font-bold uppercase block mb-1">Destination Terminal / CFS</span>
                <p className="font-semibold text-white">{activeOrder.drop?.address}</p>
              </div>
            </div>

            {/* Real Road Network Map Container */}
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-3 h-[320px] relative overflow-hidden shadow-inner">
              <TrackingMap 
                pickupLocation={activeOrder.pickup}
                dropLocation={activeOrder.drop}
                driverLocation={driver?.currentLocation}
                routeCoordinates={activeOrder.routeCoordinates || []}
                routeInfo={{
                  originName: activeOrder.pickup?.address,
                  destName: activeOrder.drop?.address,
                  distanceKm: activeOrder.distanceKm,
                  status: activeOrder.status,
                  vehicleId: driver?.vehicleId
                }}
                showWarehouses={true}
              />
            </div>

            {/* In-Transit Control */}
            <div className="p-5 bg-zinc-950/80 rounded-2xl border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-white block">Highway Freight Transit</span>
                <span className="text-xs text-zinc-400">
                  {isDriving ? `Highway Cruising (GPS Waypoint ${driveIndex + 1}/${activeOrder.routeCoordinates?.length || 31})` : 'Truck ready at loading bay'}
                </span>
              </div>

              {!isDriving && activeOrder.status !== 'completed' && (
                <button
                  onClick={handleStartTransit}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-extrabold rounded-xl text-xs transition-all shadow-lg flex items-center gap-2"
                >
                  <Play className="w-4 h-4" /> Start Transit & Stream Highway GPS
                </button>
              )}
            </div>

            {/* Delivery Completion & Handover Section */}
            {activeOrder.status !== 'completed' && (
              <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Destination Gate Handover
                  </h3>
                  <span className="text-xs text-zinc-400">
                    Confirm container unloading at destination terminal and credit freight earnings.
                  </span>
                </div>

                <button
                  onClick={handleCompleteDelivery}
                  disabled={podStatus === 'loading'}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 font-black rounded-xl text-xs transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
                >
                  {podStatus === 'loading' ? (
                    'Completing Handover...'
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-zinc-950" /> Confirm Handover & Complete Delivery
                    </>
                  )}
                </button>
              </div>
            )}

            {podStatus === 'success' && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex items-center gap-2.5 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Delivery confirmed! Freight payment has been successfully credited to your driver wallet.</span>
              </div>
            )}

            {podStatus === 'failed' && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-2xl flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

          </section>
        ) : !pendingDispatchRequest && (
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-12 text-center text-zinc-500 space-y-3">
            <Truck className="w-12 h-12 text-zinc-700 mx-auto" />
            <h3 className="text-base font-bold text-zinc-300">Stationed at Source Terminal</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Remain online at your source hub. When goods are ready for dispatch, the control tower will send an immediate load offer to your screen.
            </p>
          </div>
        )}

      </main>

    </div>
  );
}
