'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ClipboardList, FileText, Truck, Receipt, LogOut, 
  Send, Warehouse, ArrowRight, CheckCircle2, Clock, 
  ShieldCheck, AlertCircle, Sparkles, ChevronDown, Check, X,
  Info, ArrowRightLeft, ShieldAlert
} from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { 
  TAMIL_NADU_WAREHOUSES, 
  TAMIL_NADU_PRESET_ROUTES, 
  WarehouseLocation 
} from '../constants/locations';

const TrackingMap = dynamic(() => import('../components/Map'), { ssr: false });
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const COMMODITY_OPTIONS = [
  { value: 'Heavy Machinery & Industrial Equipment', label: '⚙️ Heavy Machinery & Parts', rate: 1.15 },
  { value: 'Automotive Assemblies & EV Batteries', label: '🚗 Automotive Assemblies', rate: 1.10 },
  { value: 'Textiles & Garment Bales', label: '👕 Textiles & Garments', rate: 1.0 },
  { value: 'Electronics & Semiconductor Modules', label: '💻 Electronics & Tech', rate: 1.20 },
  { value: 'Refrigerated Pharma & Cold-Chain Perishables', label: '❄️ Cold-Chain Perishables', rate: 1.30 },
  { value: 'Bonded Port Container Freight', label: '📦 Port Container Freight', rate: 1.05 },
];

export default function CustomerPortal() {
  const router = useRouter();
  
  // Navigation tab state
  const [activeNav, setActiveNav] = useState<'book' | 'quotes' | 'active' | 'billing'>('book');

  // Business profile
  const [customerName, setCustomerName] = useState('ABC Global Logistics & Freight Ltd');
  const [businessCode, setBusinessCode] = useState('ABC123');

  // Booking form mode
  const [bookingMode, setBookingMode] = useState<'preset' | 'inter_warehouse'>('preset');
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [originWarehouseId, setOriginWarehouseId] = useState(TAMIL_NADU_WAREHOUSES[0].id);
  const [destWarehouseId, setDestWarehouseId] = useState(TAMIL_NADU_WAREHOUSES[14].id); // Hosur

  // Cargo & handling
  const [weightTonnes, setWeightTonnes] = useState(12.5);
  const [commodity, setCommodity] = useState(COMMODITY_OPTIONS[0].value);
  const [storageType, setStorageType] = useState('None');
  const [storageDays, setStorageDays] = useState(3);
  const [requiresForklift, setRequiresForklift] = useState(true);

  // Operational states
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Bill review modal
  const [showBillModal, setShowBillModal] = useState(false);
  const [reviewingOrder, setReviewingOrder] = useState<any | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    const name = localStorage.getItem('user_name') || 'ABC Global Logistics & Freight Ltd';
    const bCode = localStorage.getItem('business_code') || 'ABC123';
    
    if (role !== 'customer') {
      router.push('/');
      return;
    }

    setCustomerName(name);
    setBusinessCode(bCode);

    // Socket connection
    const newSocket = io(API_URL);
    setSocket(newSocket);

    fetchData(bCode);

    newSocket.on('connect', () => {
      newSocket.emit('join_room', `customer_${bCode}`);
    });

    newSocket.on('ORDER_CREATED', (order: any) => {
      if (!order.businessCode || order.businessCode === bCode) {
        setOrders((prev) => [order, ...prev.filter(o => o.orderId !== order.orderId)]);
      }
    });

    newSocket.on('BILL_QUOTED', (order: any) => {
      if (!order.businessCode || order.businessCode === bCode) {
        setOrders((prev) => prev.map(o => o.orderId === order.orderId ? order : o));
        setSelectedOrder((prev: any) => prev && prev.orderId === order.orderId ? order : prev);
        setReviewingOrder(order);
        setShowBillModal(true);
      }
    });

    newSocket.on('BILL_ACCEPTED', (order: any) => {
      if (!order.businessCode || order.businessCode === bCode) {
        setOrders((prev) => prev.map(o => o.orderId === order.orderId ? order : o));
        setSelectedOrder((prev: any) => prev && prev.orderId === order.orderId ? order : prev);
      }
    });

    newSocket.on('BILL_REJECTED', (order: any) => {
      if (!order.businessCode || order.businessCode === bCode) {
        setOrders((prev) => prev.map(o => o.orderId === order.orderId ? order : o));
        setSelectedOrder((prev: any) => prev && prev.orderId === order.orderId ? order : prev);
      }
    });

    newSocket.on('ORDER_ASSIGNED', ({ order }: any) => {
      if (!order.businessCode || order.businessCode === bCode) {
        setOrders((prev) => prev.map(o => o.orderId === order.orderId ? order : o));
        setSelectedOrder((prev: any) => prev && prev.orderId === order.orderId ? order : prev);
      }
    });

    newSocket.on('ORDER_STATUS_UPDATED', (order: any) => {
      if (!order.businessCode || order.businessCode === bCode) {
        setOrders((prev) => prev.map(o => o.orderId === order.orderId ? order : o));
        setSelectedOrder((prev: any) => prev && prev.orderId === order.orderId ? order : prev);
      }
    });

    newSocket.on('DRIVER_UPDATED', (driver: any) => {
      setDrivers((prev) => prev.map(d => d.driverId === driver.driverId ? driver : d));
    });

    newSocket.on('TELEMETRY_UPDATED', (data: any) => {
      setDrivers((prev) => prev.map(d => {
        if (d.driverId === data.driverId) {
          return { ...d, currentLocation: data.location };
        }
        return d;
      }));
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const fetchData = async (bCode: string) => {
    try {
      const ordersRes = await axios.get(`${API_URL}/api/orders?businessCode=${bCode}`);
      setOrders(ordersRes.data);
      if (ordersRes.data.length > 0) {
        setSelectedOrder(ordersRes.data[0]);
      }

      const driversRes = await axios.get(`${API_URL}/api/drivers`);
      setDrivers(driversRes.data);
    } catch (err) {
      console.warn('Backend loading, running in offline mock state');
    }
  };

  // Derive active origin/dest for map display
  let activePickup: { lat: number; lng: number; address: string } = {
    lat: TAMIL_NADU_PRESET_ROUTES[0].pickup.lat,
    lng: TAMIL_NADU_PRESET_ROUTES[0].pickup.lng,
    address: TAMIL_NADU_PRESET_ROUTES[0].pickup.address
  };
  let activeDrop: { lat: number; lng: number; address: string } = {
    lat: TAMIL_NADU_PRESET_ROUTES[0].drop.lat,
    lng: TAMIL_NADU_PRESET_ROUTES[0].drop.lng,
    address: TAMIL_NADU_PRESET_ROUTES[0].drop.address
  };

  if (bookingMode === 'preset') {
    const route = TAMIL_NADU_PRESET_ROUTES[selectedRouteIdx] || TAMIL_NADU_PRESET_ROUTES[0];
    activePickup = route.pickup;
    activeDrop = route.drop;
  } else {
    const originWh = TAMIL_NADU_WAREHOUSES.find(w => w.id === originWarehouseId) || TAMIL_NADU_WAREHOUSES[0];
    const destWh = TAMIL_NADU_WAREHOUSES.find(w => w.id === destWarehouseId) || TAMIL_NADU_WAREHOUSES[14];
    activePickup = { lat: originWh.lat, lng: originWh.lng, address: `${originWh.name} - ${originWh.address}` };
    activeDrop = { lat: destWh.lat, lng: destWh.lng, address: `${destWh.name} - ${destWh.address}` };
  }

  // Handle Booking Submit
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      customerName,
      customerPhone: '9840123456',
      businessCode,
      pickup: activePickup,
      drop: activeDrop,
      packageDetails: {
        weight: weightTonnes * 1000,
        type: commodity,
        priority: 'medium'
      },
      warehouseServices: {
        facilityId: bookingMode === 'inter_warehouse' ? originWarehouseId : 'chennai-port',
        storageType: storageType === 'None' ? undefined : storageType,
        days: storageType === 'None' ? 0 : storageDays,
        handlingRequired: requiresForklift
      }
    };

    try {
      const res = await axios.post(`${API_URL}/api/orders`, payload);
      setOrders(prev => [res.data, ...prev]);
      setSelectedOrder(res.data);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
      setActiveNav('quotes');
    } catch (err) {
      console.warn('Backend unavailable, mock created order locally');
      const mockOrder = {
        orderId: `QE-${Math.floor(100000 + Math.random() * 900000)}`,
        businessCode,
        customerName,
        pickup: activePickup,
        drop: activeDrop,
        packageDetails: { weight: weightTonnes * 1000, type: commodity },
        warehouseServices: { storageType, days: storageDays, handlingRequired: requiresForklift },
        status: 'quote_requested',
        createdAt: new Date().toISOString()
      };
      setOrders(prev => [mockOrder, ...prev]);
      setSelectedOrder(mockOrder);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
      setActiveNav('quotes');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bill acceptance or rejection
  const handleBillDecision = async (orderId: string, decision: 'accept' | 'reject') => {
    setDecisionLoading(true);
    try {
      const endpoint = decision === 'accept' ? 'accept-bill' : 'reject-bill';
      const res = await axios.put(`${API_URL}/api/orders/${orderId}/${endpoint}`);
      setOrders(prev => prev.map(o => o.orderId === orderId ? res.data : o));
      if (selectedOrder?.orderId === orderId) {
        setSelectedOrder(res.data);
      }
      setShowBillModal(false);
    } catch (err) {
      // Mock local update
      setOrders(prev => prev.map(o => {
        if (o.orderId === orderId) {
          return { ...o, status: decision === 'accept' ? 'ready_for_dispatch' : 'bill_rejected' };
        }
        return o;
      }));
      setShowBillModal(false);
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  // Filtered orders for tab views
  const quoteOrders = orders.filter(o => ['quote_requested', 'bill_presented', 'bill_rejected'].includes(o.status));
  const activeOrders = orders.filter(o => ['ready_for_dispatch', 'dispatch_requested', 'driver_assigned', 'in_transit', 'pickup_arrived'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'completed');

  return (
    <div className="flex min-h-screen bg-[#f8f9fb] text-[#1a1d23] font-sans antialiased">
      
      {/* ==================================================================== */}
      {/* SIDEBAR: Desktop 280px Fixed Sidebar                                 */}
      {/* ==================================================================== */}
      <aside className="w-[280px] fixed inset-y-0 left-0 bg-white border-r border-black/[0.06] shadow-[2px_0_12px_rgba(0,0,0,0.03)] flex flex-col justify-between z-20">
        
        {/* Top Section */}
        <div>
          {/* Logo */}
          <div className="p-6 pb-5">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-[#1a1d23]">QUANTUM</span>
              <span className="text-xl font-bold tracking-tight text-[#e67e22]">EXPRESS</span>
            </div>
            <div className="text-[11px] text-[#9ca3af] font-medium mt-0.5">
              B2B Shipper Command Center
            </div>
          </div>

          <div className="h-[1px] bg-black/[0.06] mx-5"></div>

          {/* Shipper Info Block */}
          <div className="p-5">
            <div className="text-xs font-bold text-[#1a1d23] line-clamp-1">
              {customerName}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#e67e22]/10 text-[#e67e22] text-[11px] font-mono font-bold">
                Code: {businessCode}
              </span>
              <span className="text-[11px] text-[#5a6070]">• Verified</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-1 mt-2">
            {[
              { id: 'book', label: 'Book Freight', icon: ClipboardList, count: null },
              { id: 'quotes', label: 'My Quotations', icon: FileText, count: quoteOrders.length },
              { id: 'active', label: 'Active Shipments', icon: Truck, count: activeOrders.length },
              { id: 'billing', label: 'Billing & History', icon: Receipt, count: completedOrders.length },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id as any)}
                  className={`w-full h-10 px-3 rounded-xl flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[#e67e22]/10 text-[#e67e22] border-l-[3px] border-[#e67e22]' 
                      : 'text-[#5a6070] hover:bg-[#f1f3f6] hover:text-[#1a1d23]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#e67e22]' : 'text-[#9ca3af]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== null && item.count > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#e67e22] text-white">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-black/[0.06]">
          <button
            onClick={handleLogout}
            className="w-full h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-[#5a6070] hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit Shipper Portal</span>
          </button>
        </div>

      </aside>

      {/* ==================================================================== */}
      {/* MAIN CONTENT AREA: calc(100vw - 280px)                              */}
      {/* ==================================================================== */}
      <div className="ml-[280px] flex-1 flex flex-col min-h-screen">
        
        {/* Sticky Top Bar */}
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-black/[0.06] px-8 py-4 flex items-center justify-between shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-[#1a1d23]">
              {activeNav === 'book' && 'Book Heavy Freight & Storage'}
              {activeNav === 'quotes' && 'Dispatcher Quotations & Itemized Bills'}
              {activeNav === 'active' && 'Live In-Transit Shipments'}
              {activeNav === 'billing' && 'Commercial Billing & Completed Loads'}
            </h1>
            <p className="text-xs text-[#5a6070] mt-0.5">
              Tamil Nadu State Industrial Network • 16 Active Terminals
            </p>
          </div>

          {/* User Profile Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-[#f8f9fb] border border-black/[0.06] px-3.5 py-1.5 rounded-full">
              <div className="w-6 h-6 rounded-full bg-[#e67e22]/20 text-[#e67e22] flex items-center justify-center font-bold text-xs">
                {customerName.charAt(0)}
              </div>
              <span className="text-xs font-semibold text-[#1a1d23] truncate max-w-[160px]">
                {customerName}
              </span>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="p-8 space-y-6 flex-1">
          
          {/* TAB 1: BOOK FREIGHT */}
          {activeNav === 'book' && (
            <div className="space-y-6">
              
              {/* Success Notification Banner */}
              {submitSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Freight quotation request submitted successfully! Dispatcher is calculating exact toll & warehouse charges.</span>
                  </div>
                  <button 
                    onClick={() => setActiveNav('quotes')} 
                    className="text-[#e67e22] underline hover:text-[#f39c12] font-bold"
                  >
                    View in Quotations →
                  </button>
                </div>
              )}

              {/* Flex Row: Form (55%) + Map (45%) on Large Desktop (>1440px) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* Form Card (xl:col-span-7) */}
                <div className="xl:col-span-7">
                  <div className="qe-card p-6 md:p-7 max-w-[720px]">
                    
                    {/* Form Section Title */}
                    <div className="border-l-[3px] border-[#e67e22] pl-3 mb-6">
                      <h2 className="text-sm font-bold uppercase tracking-wider text-[#1a1d23]">
                        Book Heavy Freight & Storage
                      </h2>
                      <p className="text-xs text-[#5a6070] mt-0.5">
                        Choose route parameters, cargo commodity profile, and terminal staging requirements
                      </p>
                    </div>

                    {/* Mode Tabs */}
                    <div className="flex gap-2 p-1 bg-[#f1f3f6] rounded-xl mb-6">
                      <button
                        type="button"
                        onClick={() => setBookingMode('preset')}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          bookingMode === 'preset'
                            ? 'bg-gradient-to-r from-[#e67e22] to-[#f39c12] text-white shadow-sm'
                            : 'text-[#5a6070] hover:text-[#1a1d23]'
                        }`}
                      >
                        Preset Industrial Corridors
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingMode('inter_warehouse')}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          bookingMode === 'inter_warehouse'
                            ? 'bg-gradient-to-r from-[#e67e22] to-[#f39c12] text-white shadow-sm'
                            : 'text-[#5a6070] hover:text-[#1a1d23]'
                        }`}
                      >
                        Inter-Warehouse Terminal Point
                      </button>
                    </div>

                    <form onSubmit={handleBookingSubmit} className="space-y-5">
                      
                      {/* PRESET ROUTES DROPDOWN */}
                      {bookingMode === 'preset' && (
                        <div>
                          <label className="block text-xs font-semibold text-[#1a1d23] mb-1.5">
                            Select Industrial Freight Route
                          </label>
                          <select
                            value={selectedRouteIdx}
                            onChange={(e) => setSelectedRouteIdx(parseInt(e.target.value))}
                            className="qe-select font-medium"
                          >
                            {TAMIL_NADU_PRESET_ROUTES.map((r, idx) => (
                              <option key={idx} value={idx}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* INTER-WAREHOUSE DROPDOWNS */}
                      {bookingMode === 'inter_warehouse' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                          <div>
                            <label className="block text-xs font-semibold text-[#1a1d23] mb-1.5">
                              Origin Port / Terminal
                            </label>
                            <select
                              value={originWarehouseId}
                              onChange={(e) => setOriginWarehouseId(e.target.value)}
                              className="qe-select font-medium text-xs"
                            >
                              {TAMIL_NADU_WAREHOUSES.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.name} ({w.type})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#1a1d23] mb-1.5">
                              Destination Terminal
                            </label>
                            <select
                              value={destWarehouseId}
                              onChange={(e) => setDestWarehouseId(e.target.value)}
                              className="qe-select font-medium text-xs"
                            >
                              {TAMIL_NADU_WAREHOUSES.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.name} ({w.type})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* TWO-COLUMN ROW: Weight & Commodity */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Cargo Weight with Stepper */}
                        <div>
                          <label className="block text-xs font-semibold text-[#1a1d23] mb-1.5">
                            Cargo Weight (Metric Tonnes)
                          </label>
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => setWeightTonnes(Math.max(1, Math.round((weightTonnes - 0.5) * 10) / 10))}
                              className="w-10 h-11 bg-[#f1f3f6] text-[#1a1d23] font-bold rounded-l-lg border border-r-0 border-black/[0.06] hover:bg-[#e5e7eb] transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              max="100"
                              value={weightTonnes}
                              onChange={(e) => setWeightTonnes(parseFloat(e.target.value) || 1)}
                              className="w-full h-11 border border-black/[0.06] text-center font-bold text-sm text-[#1a1d23] outline-none focus:border-[#e67e22]"
                            />
                            <button
                              type="button"
                              onClick={() => setWeightTonnes(Math.round((weightTonnes + 0.5) * 10) / 10)}
                              className="w-10 h-11 bg-[#f1f3f6] text-[#1a1d23] font-bold rounded-r-lg border border-l-0 border-black/[0.06] hover:bg-[#e5e7eb] transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-[10px] text-[#9ca3af] mt-1 block">
                            Capacity equivalent: {(weightTonnes * 1000).toLocaleString()} kg
                          </span>
                        </div>

                        {/* Commodity Selector */}
                        <div>
                          <label className="block text-xs font-semibold text-[#1a1d23] mb-1.5">
                            Cargo Commodity
                          </label>
                          <select
                            value={commodity}
                            onChange={(e) => setCommodity(e.target.value)}
                            className="qe-select font-medium text-xs"
                          >
                            {COMMODITY_OPTIONS.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] text-[#9ca3af] mt-1 block">
                            Standard insurance coverage included
                          </span>
                        </div>

                      </div>

                      {/* Warehouse Storage & Staging */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#1a1d23] mb-1.5">
                            Warehouse Storage & Staging
                          </label>
                          <select
                            value={storageType}
                            onChange={(e) => setStorageType(e.target.value)}
                            className="qe-select font-medium text-xs"
                          >
                            <option value="None">None (Direct Cross-Dock Transit)</option>
                            <option value="Bonded Yard">Bonded Yard Storage (Customs)</option>
                            <option value="Cold Storage">Refrigerated / Cold Storage</option>
                            <option value="Pallet Staging">Pallet Staging & Buffering</option>
                            <option value="Ambient">Ambient Covered Warehousing</option>
                          </select>
                        </div>

                        {storageType !== 'None' && (
                          <div>
                            <label className="block text-xs font-semibold text-[#1a1d23] mb-1.5">
                              Staging Duration (Days)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={storageDays}
                              onChange={(e) => setStorageDays(parseInt(e.target.value) || 1)}
                              className="qe-input font-medium text-xs"
                            />
                          </div>
                        )}
                      </div>

                      {/* Forklift Toggle Switch */}
                      <div className="p-3.5 rounded-xl bg-[#f8f9fb] border border-black/[0.06] flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-[#1a1d23]">
                            Mechanized Forklift & Heavy Handling (₹1,250)
                          </div>
                          <div className="text-[11px] text-[#5a6070]">
                            Includes port crane, hydraulic ramp, and dedicated loading crew
                          </div>
                        </div>

                        <div 
                          onClick={() => setRequiresForklift(!requiresForklift)}
                          className={`qe-toggle-track ${requiresForklift ? 'active' : ''}`}
                        >
                          <div className="qe-toggle-thumb"></div>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-[#e67e22] to-[#f39c12] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 hover:shadow-amber-500/35 hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>Submit Request for Dispatcher Quotation</span>
                      </button>

                    </form>

                  </div>
                </div>

                {/* Map Card (xl:col-span-5) */}
                <div className="xl:col-span-5 flex flex-col gap-4">
                  <div className="qe-card overflow-hidden h-[420px] relative">
                    <TrackingMap
                      pickupLocation={activePickup}
                      dropLocation={activeDrop}
                      showWarehouses={true}
                    />
                  </div>

                  {/* Info Banner */}
                  <div className="p-4 rounded-xl bg-amber-500/[0.06] border-l-4 border-[#e67e22] border-y border-r border-black/[0.04]">
                    <div className="flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-[#e67e22] shrink-0 mt-0.5" />
                      <div className="text-xs text-[#5a6070] leading-relaxed">
                        <strong className="text-[#1a1d23]">B2B Quotation Workflow:</strong> Once submitted, the dispatcher calculates exact highway toll, weight surcharges, and warehouse facility fees, and presents an itemized bill for your approval.
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: MY QUOTATIONS */}
          {activeNav === 'quotes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-[#1a1d23]">
                  Quotation Requests & Approval Bills ({quoteOrders.length})
                </h2>
              </div>

              {quoteOrders.length === 0 ? (
                <div className="qe-card p-12 text-center">
                  <FileText className="w-12 h-12 text-[#9ca3af]/40 mx-auto mb-3" />
                  <div className="text-sm font-semibold text-[#1a1d23]">No pending quotations</div>
                  <div className="text-xs text-[#5a6070] mt-1">Submit a freight booking to receive itemized dispatcher bills.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quoteOrders.map((order) => {
                    const isPresented = order.status === 'bill_presented';
                    return (
                      <div key={order.orderId} className="qe-card qe-card-hover p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                            <span className="font-mono font-bold text-xs text-[#1a1d23]">{order.orderId}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isPresented 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isPresented ? 'Bill Ready for Review' : 'Quotation In Progress'}
                            </span>
                          </div>

                          <div className="mt-3 space-y-1.5 text-xs">
                            <div className="font-semibold text-[#1a1d23]">
                              {order.pickup?.address?.split(',')[0]} ➔ {order.drop?.address?.split(',')[0]}
                            </div>
                            <div className="text-[#5a6070]">
                              Cargo: <strong>{order.packageDetails?.type}</strong> • {(order.packageDetails?.weight / 1000).toFixed(1)} MT
                            </div>
                          </div>

                          {/* Price preview if available */}
                          {order.totalBillAmount && (
                            <div className="mt-4 p-3 bg-[#f8f9fb] rounded-lg border border-black/[0.04] flex items-center justify-between">
                              <span className="text-xs text-[#5a6070]">Itemized Total</span>
                              <span className="text-base font-bold text-[#e67e22]">
                                ₹{order.totalBillAmount?.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-5 pt-3 border-t border-black/[0.06] flex items-center justify-between">
                          <span className="text-[11px] text-[#9ca3af]">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>

                          {isPresented ? (
                            <button
                              onClick={() => { setReviewingOrder(order); setShowBillModal(true); }}
                              className="px-3.5 py-1.5 bg-[#e67e22] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#d35400] transition-colors cursor-pointer"
                            >
                              Review & Accept Bill →
                            </button>
                          ) : (
                            <span className="text-xs text-[#5a6070] italic">
                              Dispatcher Calculating...
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACTIVE SHIPMENTS */}
          {activeNav === 'active' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#1a1d23]">
                Live In-Transit Shipments ({activeOrders.length})
              </h2>

              {activeOrders.length === 0 ? (
                <div className="qe-card p-12 text-center">
                  <Truck className="w-12 h-12 text-[#9ca3af]/40 mx-auto mb-3" />
                  <div className="text-sm font-semibold text-[#1a1d23]">No active shipments en route</div>
                  <div className="text-xs text-[#5a6070] mt-1">Accepted freight orders being hauled will appear here in real time.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeOrders.map((order) => (
                    <div key={order.orderId} className="qe-card p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
                      <div className="lg:col-span-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sm text-[#1a1d23]">{order.orderId}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            {order.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>

                        <div className="text-sm font-bold text-[#1a1d23]">
                          {order.pickup?.address} ➔ {order.drop?.address}
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs bg-[#f8f9fb] p-3 rounded-lg border border-black/[0.04]">
                          <div>
                            <span className="text-[#9ca3af] block text-[10px] uppercase font-bold">Assigned Vehicle</span>
                            <span className="font-bold text-[#1a1d23]">{order.vehicleId || 'Station Truck'}</span>
                          </div>
                          <div>
                            <span className="text-[#9ca3af] block text-[10px] uppercase font-bold">Driver Badge</span>
                            <span className="font-bold text-[#1a1d23]">{order.driverName || 'Tamil Nadu Driver'}</span>
                          </div>
                          <div>
                            <span className="text-[#9ca3af] block text-[10px] uppercase font-bold">Freight Fee</span>
                            <span className="font-bold text-[#e67e22]">₹{order.totalBillAmount?.toLocaleString() || '₹24,500'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="h-44 rounded-xl overflow-hidden border border-black/[0.06]">
                        <TrackingMap
                          pickupLocation={order.pickup}
                          dropLocation={order.drop}
                          showWarehouses={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BILLING & HISTORY */}
          {activeNav === 'billing' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#1a1d23]">
                Commercial Billing & Completed Loads ({completedOrders.length})
              </h2>

              {completedOrders.length === 0 ? (
                <div className="qe-card p-12 text-center">
                  <Receipt className="w-12 h-12 text-[#9ca3af]/40 mx-auto mb-3" />
                  <div className="text-sm font-semibold text-[#1a1d23]">No completed loads yet</div>
                  <div className="text-xs text-[#5a6070] mt-1">Delivered shipments with verified POD receipts will be archived here.</div>
                </div>
              ) : (
                <div className="qe-card overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f1f3f6] text-[#5a6070] uppercase font-bold text-[10px]">
                      <tr>
                        <th className="p-3.5">Order ID</th>
                        <th className="p-3.5">Route</th>
                        <th className="p-3.5">Cargo</th>
                        <th className="p-3.5">Amount</th>
                        <th className="p-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.06]">
                      {completedOrders.map((order) => (
                        <tr key={order.orderId} className="qe-table-row">
                          <td className="p-3.5 font-mono font-bold text-[#1a1d23]">{order.orderId}</td>
                          <td className="p-3.5 font-medium">{order.pickup?.address?.split(',')[0]} ➔ {order.drop?.address?.split(',')[0]}</td>
                          <td className="p-3.5">{order.packageDetails?.type}</td>
                          <td className="p-3.5 font-bold text-[#e67e22]">₹{order.totalBillAmount?.toLocaleString()}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              Delivered & Invoiced
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </main>

      </div>

      {/* ==================================================================== */}
      {/* MODAL: Dispatcher Itemized Quotation Bill Review                      */}
      {/* ==================================================================== */}
      {showBillModal && reviewingOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-black/[0.06]">
            
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
              <div>
                <h3 className="text-base font-bold text-[#1a1d23]">
                  Dispatcher Itemized Bill Quotation
                </h3>
                <span className="text-xs font-mono text-[#9ca3af]">
                  Order: {reviewingOrder.orderId}
                </span>
              </div>
              <button 
                onClick={() => setShowBillModal(false)}
                className="text-[#9ca3af] hover:text-[#1a1d23] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 space-y-3">
              <div className="p-3 rounded-xl bg-[#f8f9fb] border border-black/[0.04] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#5a6070]">Base Highway Freight:</span>
                  <span className="font-bold text-[#1a1d23]">₹{reviewingOrder.itemizedBill?.freightBase?.toLocaleString() || '18,500'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5a6070]">State Highway Toll & Surcharges:</span>
                  <span className="font-bold text-[#1a1d23]">₹{reviewingOrder.itemizedBill?.tollSurcharge?.toLocaleString() || '2,400'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5a6070]">Warehouse Staging Facility Fee:</span>
                  <span className="font-bold text-[#1a1d23]">₹{reviewingOrder.itemizedBill?.storageFee?.toLocaleString() || '1,800'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5a6070]">Mechanized Handling / Forklift:</span>
                  <span className="font-bold text-[#1a1d23]">₹{reviewingOrder.itemizedBill?.handlingFee?.toLocaleString() || '1,250'}</span>
                </div>
                <div className="pt-2 border-t border-black/[0.06] flex justify-between text-sm font-bold text-[#1a1d23]">
                  <span>Total Payable:</span>
                  <span className="text-[#e67e22] text-base">
                    ₹{reviewingOrder.totalBillAmount?.toLocaleString() || '23,950'}
                  </span>
                </div>
              </div>

              {reviewingOrder.itemizedBill?.notes && (
                <div className="text-xs text-[#5a6070] italic bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  Note from Dispatcher: "{reviewingOrder.itemizedBill.notes}"
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-3 border-t border-black/[0.06]">
              <button
                disabled={decisionLoading}
                onClick={() => handleBillDecision(reviewingOrder.orderId, 'reject')}
                className="flex-1 h-10 rounded-xl bg-white border border-rose-300 text-rose-600 font-semibold text-xs hover:bg-rose-50 transition-colors cursor-pointer"
              >
                Decline Quote
              </button>
              <button
                disabled={decisionLoading}
                onClick={() => handleBillDecision(reviewingOrder.orderId, 'accept')}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#e67e22] to-[#f39c12] text-white font-bold text-xs shadow-md hover:shadow-amber-500/30 transition-all cursor-pointer"
              >
                Accept & Confirm Dispatch
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
