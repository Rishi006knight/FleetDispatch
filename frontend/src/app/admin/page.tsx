'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Radio, Truck, Warehouse, CheckCircle2, AlertTriangle, 
  IndianRupee, Activity, ShieldCheck, FileText, Send, 
  Check, X, LogOut, ChevronRight, User, RefreshCw,
  Search, ShieldAlert, Sparkles, Filter, Inbox
} from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { TAMIL_NADU_WAREHOUSES, WarehouseLocation } from '../constants/locations';

const TrackingMap = dynamic(() => import('../components/Map'), { ssr: false });
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function AdminDashboard() {
  const router = useRouter();
  
  // Real-time states
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [socket, setSocket] = useState<any>(null);

  // Filter tabs: 'all' | 'quotes' | 'ready' | 'active' | 'completed'
  const [activeTab, setActiveTab] = useState<'all' | 'quotes' | 'ready' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected order & action modals
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  
  // Quotation Editor Modal state
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteFreightBase, setQuoteFreightBase] = useState<number>(18500);
  const [quoteStorageFee, setQuoteStorageFee] = useState<number>(1800);
  const [quoteHandlingFee, setQuoteHandlingFee] = useState<number>(1250);
  const [quoteTollSurcharge, setQuoteTollSurcharge] = useState<number>(2400);
  const [quoteNotes, setQuoteNotes] = useState<string>('Standard GST-4 corridor transit toll and port crane handling included.');
  const [isSendingQuote, setIsSendingQuote] = useState(false);

  // Driver Match Modal state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [matchingDrivers, setMatchingDrivers] = useState<any[]>([]);
  const [isDispatching, setIsDispatching] = useState(false);

  // KPI Animated Count-up values
  const [animatedRevenue, setAnimatedRevenue] = useState(0);
  const [targetRevenue, setTargetRevenue] = useState(285400);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'admin') {
      router.push('/');
      return;
    }

    // Socket setup
    const newSocket = io(API_URL);
    setSocket(newSocket);

    fetchData();

    newSocket.on('connect', () => {
      newSocket.emit('join_room', 'admin');
    });

    newSocket.on('ORDER_CREATED', (order: any) => {
      setOrders((prev) => [order, ...prev.filter(o => o.orderId !== order.orderId)]);
    });

    newSocket.on('QUOTE_REQUESTED', (order: any) => {
      setOrders((prev) => [order, ...prev.filter(o => o.orderId !== order.orderId)]);
      setSelectedOrder(order);
    });

    newSocket.on('BILL_QUOTED', (order: any) => {
      setOrders((prev) => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder((prev: any) => prev && prev.orderId === order.orderId ? order : prev);
    });

    newSocket.on('BILL_ACCEPTED', (order: any) => {
      setOrders((prev) => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder((prev: any) => prev && prev.orderId === order.orderId ? order : prev);
    });

    newSocket.on('BILL_REJECTED', (order: any) => {
      setOrders((prev) => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder((prev: any) => prev && prev.orderId === order.orderId ? order : prev);
    });

    newSocket.on('ORDER_DISPATCH_REQUEST', ({ order }: any) => {
      setOrders((prev) => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder((prev: any) => prev && prev.orderId === order.orderId ? order : prev);
    });

    newSocket.on('DISPATCH_REQUEST_DECLINED', ({ order }: any) => {
      setOrders((prev) => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder((prev: any) => prev && prev.orderId === order.orderId ? order : prev);
    });

    newSocket.on('ORDER_ASSIGNED', ({ order, driver }: any) => {
      setOrders((prev) => prev.map(o => o.orderId === order.orderId ? order : o));
      setDrivers((prev) => prev.map(d => d.driverId === driver.driverId ? driver : d));
      setSelectedOrder((prev: any) => prev && prev.orderId === order.orderId ? order : prev);
    });

    newSocket.on('ORDER_STATUS_UPDATED', (order: any) => {
      setOrders((prev) => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder((prev: any) => prev && prev.orderId === order.orderId ? order : prev);
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

    newSocket.on('INCIDENT_CREATED', (incident: any) => {
      setIncidents(prev => [incident, ...prev]);
    });

    newSocket.on('INCIDENT_RESOLVED', (incident: any) => {
      setIncidents(prev => prev.map(i => i.incidentId === incident.incidentId ? incident : i));
    });

    // Count-up animation for revenue
    const duration = 1500;
    const startTime = performance.now();
    const animateRevenue = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimatedRevenue(Math.round(ease * 285400));
      if (progress < 1) {
        requestAnimationFrame(animateRevenue);
      }
    };
    requestAnimationFrame(animateRevenue);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const fetchData = async () => {
    try {
      const ordersRes = await axios.get(`${API_URL}/api/orders`);
      setOrders(ordersRes.data);
      if (ordersRes.data.length > 0) {
        setSelectedOrder(ordersRes.data[0]);
      }

      const driversRes = await axios.get(`${API_URL}/api/drivers`);
      setDrivers(driversRes.data);

      const incRes = await axios.get(`${API_URL}/api/incidents`);
      setIncidents(incRes.data);
    } catch (err) {
      console.warn('Running with local mock fallback');
    }
  };

  // Open Quotation Modal with initial calculations
  const handleOpenQuotation = (order: any) => {
    setSelectedOrder(order);
    const weightTons = (order.packageDetails?.weight || 12000) / 1000;
    const base = Math.round(weightTons * 1250 + 5000);
    const toll = Math.round(weightTons * 150 + 1200);
    const storage = order.warehouseServices?.storageType && order.warehouseServices?.storageType !== 'None'
      ? (order.warehouseServices.days || 3) * 600
      : 0;
    const handling = order.warehouseServices?.handlingRequired ? 1250 : 0;

    setQuoteFreightBase(base);
    setQuoteTollSurcharge(toll);
    setQuoteStorageFee(storage);
    setQuoteHandlingFee(handling);
    setQuoteNotes(`Standard GST corridor toll and ${order.packageDetails?.type || 'general cargo'} surcharge applied.`);
    setShowQuoteModal(true);
  };

  // Submit Quotation Bill
  const handleSubmitQuotation = async () => {
    if (!selectedOrder) return;
    setIsSendingQuote(true);

    const total = quoteFreightBase + quoteStorageFee + quoteHandlingFee + quoteTollSurcharge;

    try {
      const res = await axios.put(`${API_URL}/api/orders/${selectedOrder.orderId}/quote-bill`, {
        freightBase: quoteFreightBase,
        storageFee: quoteStorageFee,
        handlingFee: quoteHandlingFee,
        tollSurcharge: quoteTollSurcharge,
        notes: quoteNotes,
        totalAmount: total
      });

      setOrders(prev => prev.map(o => o.orderId === selectedOrder.orderId ? res.data : o));
      setSelectedOrder(res.data);
      setShowQuoteModal(false);
    } catch (err) {
      // Local update fallback
      const updated = {
        ...selectedOrder,
        status: 'bill_presented',
        totalBillAmount: total,
        itemizedBill: {
          freightBase: quoteFreightBase,
          storageFee: quoteStorageFee,
          handlingFee: quoteHandlingFee,
          tollSurcharge: quoteTollSurcharge,
          notes: quoteNotes
        }
      };
      setOrders(prev => prev.map(o => o.orderId === selectedOrder.orderId ? updated : o));
      setSelectedOrder(updated);
      setShowQuoteModal(false);
    } finally {
      setIsSendingQuote(false);
    }
  };

  // Open Driver Match Modal
  const handleOpenDispatch = async (order: any) => {
    setSelectedOrder(order);
    setShowDispatchModal(true);

    try {
      const res = await axios.get(`${API_URL}/api/drivers`);
      const allDrivers = res.data;
      setMatchingDrivers(allDrivers.length > 0 ? allDrivers : [
        { driverId: 'TRK-01-1001', name: 'Murugan (Chennai Port CFS)', vehicleId: 'TN-01-TR-1001', vehicleType: '32ft Heavy Trailer', status: 'online' },
        { driverId: 'TRK-02-1001', name: 'Shanmugam (Ennore Kamarajar)', vehicleId: 'TN-02-TR-1001', vehicleType: '40ft Container Freightliner', status: 'online' },
        { driverId: 'TRK-38-1001', name: 'Senthil Kumar (Coimbatore Hub)', vehicleId: 'TN-38-TR-1001', vehicleType: '20ft Multi-Axle Truck', status: 'online' },
      ]);
    } catch (err) {
      setMatchingDrivers([
        { driverId: 'TRK-01-1001', name: 'Murugan (Chennai Port CFS)', vehicleId: 'TN-01-TR-1001', vehicleType: '32ft Heavy Trailer', status: 'online' },
        { driverId: 'TRK-02-1001', name: 'Shanmugam (Ennore Kamarajar)', vehicleId: 'TN-02-TR-1001', vehicleType: '40ft Container Freightliner', status: 'online' },
        { driverId: 'TRK-38-1001', name: 'Senthil Kumar (Coimbatore Hub)', vehicleId: 'TN-38-TR-1001', vehicleType: '20ft Multi-Axle Truck', status: 'online' },
      ]);
    }
  };

  // Dispatch to Driver
  const handleConfirmDispatch = async (targetDriver: any) => {
    if (!selectedOrder) return;
    setIsDispatching(true);

    try {
      const res = await axios.post(`${API_URL}/api/orders/${selectedOrder.orderId}/request-dispatch`, {
        driverId: targetDriver.driverId
      });
      setOrders(prev => prev.map(o => o.orderId === selectedOrder.orderId ? res.data.order || o : o));
      setSelectedOrder(res.data.order || selectedOrder);
      setShowDispatchModal(false);
    } catch (err) {
      const updated = {
        ...selectedOrder,
        status: 'dispatch_requested',
        dispatchRequestedDriverId: targetDriver.driverId,
        driverName: targetDriver.name,
        vehicleId: targetDriver.vehicleId
      };
      setOrders(prev => prev.map(o => o.orderId === selectedOrder.orderId ? updated : o));
      setSelectedOrder(updated);
      setShowDispatchModal(false);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'quotes') return ['quote_requested', 'bill_presented', 'bill_rejected'].includes(o.status);
    if (activeTab === 'ready') return o.status === 'ready_for_dispatch';
    if (activeTab === 'active') return ['dispatch_requested', 'driver_assigned', 'in_transit', 'pickup_arrived'].includes(o.status);
    if (activeTab === 'completed') return o.status === 'completed';
    return true;
  });

  const activeTruckCount = drivers.filter(d => d.status === 'busy' || d.status === 'in_transit').length;
  const readyCount = orders.filter(o => o.status === 'ready_for_dispatch').length;

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-[#1a1d23] font-sans antialiased flex flex-col">
      
      {/* ==================================================================== */}
      {/* TOP BAR: Full Width Header                                           */}
      {/* ==================================================================== */}
      <header className="bg-white border-b border-black/[0.06] px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold tracking-tight text-[#1a1d23]">QUANTUM</span>
            <span className="text-lg font-bold tracking-tight text-[#e67e22]">EXPRESS</span>
          </div>
          <span className="text-sm font-bold text-[#1a1d23] pl-3 border-l border-black/[0.1]">
            Dispatcher Control Tower
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#e67e22]/10 text-[#e67e22] text-[11px] font-bold">
            16 State Logistics Hubs
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#f8f9fb] border border-black/[0.06] px-3.5 py-1.5 rounded-full">
            <div className="w-5 h-5 rounded-full bg-[#e67e22] text-white flex items-center justify-center text-[10px] font-bold">
              A
            </div>
            <span className="text-xs font-semibold text-[#1a1d23]">admin</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#5a6070] hover:text-rose-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* MAIN CSS GRID MOSAIC COMMAND CENTER (1440px+ Desktop Optimized)     */}
      {/* ==================================================================== */}
      <main className="p-6 space-y-5 flex-1 max-w-[1720px] mx-auto w-full">
        
        {/* ROW 1: 5 KPI STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          
          {/* KPI 1: Revenue (Amber Border) */}
          <div className="qe-card qe-card-hover p-4 border-l-4 border-[#e67e22] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#e67e22]/10 flex items-center justify-center text-[#e67e22] shrink-0">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] block">
                Freight & Storage Revenue
              </span>
              <span className="text-xl font-bold text-[#e67e22]">
                ₹{animatedRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* KPI 2: Active Heavy Trucks (Blue Border) */}
          <div className="qe-card qe-card-hover p-4 border-l-4 border-[#3b82f6] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] block">
                Active Heavy Trucks
              </span>
              <span className="text-xl font-bold text-[#1a1d23]">
                {activeTruckCount} <span className="text-xs font-semibold text-[#5a6070]">En Route</span>
              </span>
            </div>
          </div>

          {/* KPI 3: Terminals & Ports (Green Border) */}
          <div className="qe-card qe-card-hover p-4 border-l-4 border-[#10b981] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#10b981]/10 flex items-center justify-center text-[#10b981] shrink-0">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] block">
                Terminals & Ports
              </span>
              <span className="text-xl font-bold text-[#1a1d23] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                16 Hubs
              </span>
            </div>
          </div>

          {/* KPI 4: Ready for Dispatch (Amber Border with Pulse if > 0) */}
          <div className={`qe-card qe-card-hover p-4 border-l-4 flex items-center gap-3.5 ${
            readyCount > 0 ? 'border-[#e67e22] bg-amber-500/[0.02]' : 'border-gray-300'
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              readyCount > 0 ? 'bg-[#e67e22]/10 text-[#e67e22]' : 'bg-gray-100 text-gray-400'
            }`}>
              <Send className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] block">
                Ready For Dispatch
              </span>
              <span className="text-xl font-bold text-[#1a1d23] flex items-center gap-1.5">
                {readyCount > 0 && <span className="w-2 h-2 rounded-full bg-[#e67e22] animate-ping"></span>}
                {readyCount} <span className="text-xs font-semibold text-[#5a6070]">Loads</span>
              </span>
            </div>
          </div>

          {/* KPI 5: System Uptime (Green Border) */}
          <div className="qe-card qe-card-hover p-4 border-l-4 border-[#10b981] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#10b981]/10 flex items-center justify-center text-[#10b981] shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] block">
                System Uptime
              </span>
              <span className="text-xl font-bold text-emerald-600">
                99.9% <span className="text-[10px] text-[#5a6070] font-normal">Operational</span>
              </span>
            </div>
          </div>

        </div>

        {/* ROW 2: LIVE MAP (60% = 3/5) & CONSIGNMENTS TABLE (40% = 2/5) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Live Map Panel (lg:col-span-7 = 3/5 width, ~450px height) */}
          <div className="lg:col-span-7 qe-card overflow-hidden h-[450px] relative flex flex-col">
            <div className="p-3.5 bg-white border-b border-black/[0.06] flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1a1d23]">
                  Tamil Nadu Live Freight Corridors
                </span>
                <span className="text-[10px] text-[#9ca3af]">• 16 Station CFS Nodes</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live Positron Fleet
              </span>
            </div>

            <div className="flex-1 w-full h-full relative">
              <TrackingMap
                pickupLocation={selectedOrder?.pickup}
                dropLocation={selectedOrder?.drop}
                otherDrivers={drivers}
                showWarehouses={true}
              />
            </div>
          </div>

          {/* Consignments & Quotations Table (lg:col-span-5 = 2/5 width, ~450px height) */}
          <div className="lg:col-span-5 qe-card overflow-hidden h-[450px] flex flex-col">
            
            {/* Header & Record Count Badge */}
            <div className="p-3.5 border-b border-black/[0.06] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1a1d23]">
                Consignments & Quotations
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#e67e22]/10 text-[#e67e22] text-[10px] font-mono font-bold">
                {filteredOrders.length} records
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="px-3 py-2 bg-[#f8f9fb] border-b border-black/[0.06] flex gap-1 overflow-x-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'quotes', label: 'Quotes' },
                { id: 'ready', label: 'Ready Dispatch' },
                { id: 'active', label: 'Active' },
                { id: 'completed', label: 'Completed' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-gradient-to-r from-[#e67e22] to-[#f39c12] text-white shadow-xs' 
                        : 'text-[#5a6070] hover:bg-black/[0.04]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Table or Empty State */}
            <div className="flex-1 overflow-y-auto">
              {filteredOrders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <Inbox className="w-10 h-10 text-[#9ca3af]/40 mb-2" />
                  <div className="text-xs font-bold text-[#1a1d23]">No orders in this view</div>
                  <div className="text-[11px] text-[#5a6070] mt-0.5">Submit a freight request from the Shipper portal to populate.</div>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#f1f3f6] text-[#5a6070] uppercase font-bold text-[10px] z-10">
                    <tr>
                      <th className="p-2.5">ID / Shipper</th>
                      <th className="p-2.5">Route</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06]">
                    {filteredOrders.map((order) => {
                      const isSelected = selectedOrder?.orderId === order.orderId;
                      return (
                        <tr 
                          key={order.orderId}
                          onClick={() => setSelectedOrder(order)}
                          className={`qe-table-row cursor-pointer ${isSelected ? 'bg-amber-500/[0.06]' : ''}`}
                        >
                          <td className="p-2.5">
                            <div className="font-mono font-bold text-[#1a1d23] text-[11px]">{order.orderId}</div>
                            <div className="text-[10px] text-[#5a6070] truncate max-w-[100px]">{order.customerName || order.businessCode}</div>
                          </td>
                          <td className="p-2.5">
                            <div className="font-semibold text-[#1a1d23] text-[11px]">
                              {order.pickup?.address?.split(',')[0]} ➔ {order.drop?.address?.split(',')[0]}
                            </div>
                            <div className="text-[10px] text-[#9ca3af]">
                              {order.packageDetails?.type} • {(order.packageDetails?.weight / 1000).toFixed(1)} MT
                            </div>
                          </td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              order.status === 'quote_requested' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'bill_presented' ? 'bg-amber-100 text-amber-800' :
                              order.status === 'ready_for_dispatch' ? 'bg-emerald-100 text-emerald-800 animate-pulse' :
                              order.status === 'in_transit' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {order.status === 'quote_requested' ? 'Quotation Req' :
                               order.status === 'bill_presented' ? 'Bill Sent' :
                               order.status === 'ready_for_dispatch' ? 'Ready Dispatch' :
                               order.status === 'in_transit' ? 'In Transit' :
                               order.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            {order.status === 'quote_requested' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenQuotation(order); }}
                                className="px-2.5 py-1 bg-[#e67e22] text-white text-[10px] font-bold rounded hover:bg-[#d35400] transition-colors"
                              >
                                Quote Bill
                              </button>
                            )}
                            {order.status === 'ready_for_dispatch' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenDispatch(order); }}
                                className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 transition-colors"
                              >
                                Match Driver
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>

        </div>

        {/* ROW 3: TERMINAL CAPACITY LIST (~65% = 8 cols) & INCIDENTS PANEL (~35% = 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Terminal & Port CFS Fleet Capacity (lg:col-span-8 = ~65%, max-height 350px) */}
          <div className="lg:col-span-8 qe-card overflow-hidden h-[350px] flex flex-col">
            
            <div className="p-3.5 border-b border-black/[0.06] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1a1d23]">
                Terminal & Port CFS Fleet Capacity
              </span>
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                16 Hubs Online
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-black/[0.06]">
              {TAMIL_NADU_WAREHOUSES.map((hub) => {
                const isPort = hub.type === 'Port Terminal';
                return (
                  <div 
                    key={hub.id} 
                    className={`p-3 px-4 flex items-center justify-between qe-table-row ${
                      isPort ? 'border-l-[3px] border-[#e67e22]' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1a1d23]">{hub.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          hub.type === 'Port Terminal' ? 'bg-[#e67e22]/10 text-[#e67e22]' :
                          hub.type === 'Primary Gateway' ? 'bg-amber-100 text-amber-800' :
                          hub.type === 'Industrial Hub' ? 'bg-blue-100 text-blue-800' :
                          'bg-teal-100 text-teal-800'
                        }`}>
                          {hub.type}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#9ca3af] mt-0.5">
                        {hub.storageTypes.join(' • ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right shrink-0">
                      <div>
                        <span className="text-xs font-bold text-[#1a1d23] block">{hub.activeFleet}</span>
                        <span className="text-[10px] text-[#9ca3af] uppercase">Trucks</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#5a6070] block">{hub.capacityTonnes.toLocaleString()} MT</span>
                        <span className="text-[10px] text-[#9ca3af] uppercase">Storage Cap</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Real-Time Freight Incidents Panel (lg:col-span-4 = ~35%, max-height 350px) */}
          <div className="lg:col-span-4 qe-card overflow-hidden h-[350px] flex flex-col">
            
            <div className="p-3.5 border-b border-black/[0.06] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1a1d23]">
                Real-Time Freight Incidents
              </span>
              <span className="text-[11px] font-bold text-emerald-600">
                {incidents.length} active
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              {incidents.length === 0 ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-emerald-600">All Clear</div>
                  <p className="text-xs text-[#5a6070] max-w-xs">
                    All Tamil Nadu freight corridors operating normally. No active road blocks or weather alerts.
                  </p>
                </div>
              ) : (
                <div className="w-full space-y-2 overflow-y-auto">
                  {incidents.map((inc: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border-l-4 border-rose-500 bg-rose-50 text-left text-xs">
                      <div className="font-bold text-rose-800">{inc.title || 'Highway Corridor Delay'}</div>
                      <div className="text-rose-600 text-[11px]">{inc.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </main>

      {/* ==================================================================== */}
      {/* MODAL: Dispatcher Itemized Quotation Form Customizer                 */}
      {/* ==================================================================== */}
      {showQuoteModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-black/[0.06]">
            
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <div>
                <h3 className="text-base font-bold text-[#1a1d23]">
                  Prepare Itemized Freight Bill
                </h3>
                <span className="text-xs font-mono text-[#9ca3af]">
                  Order: {selectedOrder.orderId}
                </span>
              </div>
              <button 
                onClick={() => setShowQuoteModal(false)}
                className="text-[#9ca3af] hover:text-[#1a1d23] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#5a6070] mb-1">
                  Base Highway Freight (₹)
                </label>
                <input
                  type="number"
                  value={quoteFreightBase}
                  onChange={(e) => setQuoteFreightBase(parseInt(e.target.value) || 0)}
                  className="qe-input text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#5a6070] mb-1">
                  State Highway Toll & Surcharges (₹)
                </label>
                <input
                  type="number"
                  value={quoteTollSurcharge}
                  onChange={(e) => setQuoteTollSurcharge(parseInt(e.target.value) || 0)}
                  className="qe-input text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#5a6070] mb-1">
                  Warehouse Staging / Buffer Fee (₹)
                </label>
                <input
                  type="number"
                  value={quoteStorageFee}
                  onChange={(e) => setQuoteStorageFee(parseInt(e.target.value) || 0)}
                  className="qe-input text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#5a6070] mb-1">
                  Mechanized Loading / Forklift (₹)
                </label>
                <input
                  type="number"
                  value={quoteHandlingFee}
                  onChange={(e) => setQuoteHandlingFee(parseInt(e.target.value) || 0)}
                  className="qe-input text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#5a6070] mb-1">
                  Dispatcher Notes to Shipper
                </label>
                <input
                  type="text"
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  className="qe-input text-xs"
                />
              </div>

              <div className="p-3 bg-[#f8f9fb] rounded-xl border border-black/[0.04] flex items-center justify-between text-sm font-bold">
                <span className="text-[#5a6070]">Total Quotation:</span>
                <span className="text-base text-[#e67e22]">
                  ₹{(quoteFreightBase + quoteStorageFee + quoteHandlingFee + quoteTollSurcharge).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-black/[0.06]">
              <button
                onClick={() => setShowQuoteModal(false)}
                className="flex-1 h-10 rounded-xl bg-white border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isSendingQuote}
                onClick={handleSubmitQuotation}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#e67e22] to-[#f39c12] text-white font-bold text-xs shadow-md hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Present Bill to Shipper</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: Driver Dispatch Matcher Drawer                                 */}
      {/* ==================================================================== */}
      {showDispatchModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-black/[0.06]">
            
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <div>
                <h3 className="text-base font-bold text-[#1a1d23]">
                  Assign Available Station Truck
                </h3>
                <span className="text-xs text-[#5a6070]">
                  {selectedOrder.pickup?.address?.split(',')[0]} ➔ {selectedOrder.drop?.address?.split(',')[0]}
                </span>
              </div>
              <button 
                onClick={() => setShowDispatchModal(false)}
                className="text-[#9ca3af] hover:text-[#1a1d23] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-2.5 max-h-72 overflow-y-auto">
              {matchingDrivers.map((drv) => (
                <div key={drv.driverId} className="p-3 rounded-xl border border-black/[0.06] bg-[#f8f9fb] flex items-center justify-between hover:border-[#e67e22] transition-colors">
                  <div>
                    <div className="font-bold text-xs text-[#1a1d23]">{drv.name}</div>
                    <div className="text-[10px] font-mono text-[#5a6070]">
                      Vehicle: {drv.vehicleId} • {drv.vehicleType || '32ft Trailer'}
                    </div>
                  </div>
                  <button
                    disabled={isDispatching}
                    onClick={() => handleConfirmDispatch(drv)}
                    className="px-3 py-1.5 bg-[#e67e22] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#d35400] transition-colors cursor-pointer"
                  >
                    Dispatch Truck
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-black/[0.06] text-right">
              <button
                onClick={() => setShowDispatchModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
