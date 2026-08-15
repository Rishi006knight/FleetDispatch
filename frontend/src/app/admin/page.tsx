'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, AlertTriangle, Play, RefreshCw, BarChart3, 
  MapPin, User, LogOut, TrendingUp, Compass, Cpu, 
  Zap, CheckCircle2, DollarSign, Leaf, RefreshCcw,
  Truck, Warehouse, FileText, Send, Check, X, Building2, Anchor, Radio
} from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { TAMIL_NADU_WAREHOUSES } from '../constants/locations';

const Map = dynamic(() => import('../components/Map'), { ssr: false });
const TrackingMap = dynamic(() => import('../components/Map'), { ssr: false });
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function AdminDashboard() {
  const router = useRouter();
  
  // Real-time states
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    totalRevenue: 285400,
    activeOrders: 0,
    slaCompliance: 96,
    carbonEmissionsKg: 420.5,
    driverLeaderboard: []
  });

  // UI Selection states
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [driverMatches, setDriverMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [sendingDispatch, setSendingDispatch] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  // Dispatcher Quotation & Billing customizer
  const [editFreightBase, setEditFreightBase] = useState<number>(0);
  const [editStorageFee, setEditStorageFee] = useState<number>(0);
  const [editHandlingFee, setEditHandlingFee] = useState<number>(0);
  const [editTollSurcharge, setEditTollSurcharge] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');
  const [presentingBill, setPresentingBill] = useState(false);

  // Active Tab Filter for Orders: All, Quotes, Ready for Dispatch, In Transit, Completed
  const [orderFilter, setOrderFilter] = useState<'all' | 'quotes' | 'confirmed' | 'active' | 'completed'>('all');

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'admin') {
      router.push('/');
      return;
    }

    const newSocket = io(API_URL);
    setSocket(newSocket);

    fetchData();

    newSocket.on('connect', () => {
      newSocket.emit('join_room', 'admin');
    });

    newSocket.on('ORDER_CREATED', (order) => {
      setOrders(prev => [order, ...prev.filter(o => o.orderId !== order.orderId)]);
      fetchAnalytics();
    });

    newSocket.on('QUOTE_REQUESTED', (order) => {
      setOrders(prev => [order, ...prev.filter(o => o.orderId !== order.orderId)]);
      setSelectedOrder(order);
    });

    newSocket.on('BILL_QUOTED', (order) => {
      setOrders(prev => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder(prev => prev && prev.orderId === order.orderId ? order : prev);
      fetchAnalytics();
    });

    newSocket.on('BILL_ACCEPTED', (order) => {
      setOrders(prev => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder(prev => prev && prev.orderId === order.orderId ? order : prev);
      fetchAnalytics();
    });

    newSocket.on('BILL_REJECTED', (order) => {
      setOrders(prev => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder(prev => prev && prev.orderId === order.orderId ? order : prev);
    });

    newSocket.on('ORDER_DISPATCH_REQUEST', ({ order, driver }) => {
      setOrders(prev => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder(prev => prev && prev.orderId === order.orderId ? order : prev);
    });

    newSocket.on('DISPATCH_REQUEST_DECLINED', ({ order, driver }) => {
      setOrders(prev => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder(prev => prev && prev.orderId === order.orderId ? order : prev);
    });

    newSocket.on('ORDER_ASSIGNED', ({ order, driver }) => {
      setOrders(prev => prev.map(o => o.orderId === order.orderId ? order : o));
      setDrivers(prev => prev.map(d => d.driverId === driver.driverId ? driver : d));
      setSelectedOrder(prev => prev && prev.orderId === order.orderId ? order : prev);
      fetchAnalytics();
    });

    newSocket.on('ORDER_STATUS_UPDATED', (order) => {
      setOrders(prev => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder(prev => prev && prev.orderId === order.orderId ? order : prev);
      fetchAnalytics();
    });

    newSocket.on('DRIVER_UPDATED', (driver) => {
      setDrivers(prev => prev.map(d => d.driverId === driver.driverId ? driver : d));
    });

    newSocket.on('TELEMETRY_UPDATED', (data) => {
      setDrivers(prev => prev.map(d => {
        if (d.driverId === data.driverId) {
          return { ...d, currentLocation: data.location };
        }
        return d;
      }));
    });

    newSocket.on('INCIDENT_CREATED', (incident) => {
      setIncidents(prev => [incident, ...prev]);
    });

    newSocket.on('INCIDENT_RESOLVED', (incident) => {
      setIncidents(prev => prev.map(i => i.incidentId === incident.incidentId ? incident : i));
    });

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
        initBillingForm(ordersRes.data[0]);
      }

      const driversRes = await axios.get(`${API_URL}/api/drivers`);
      setDrivers(driversRes.data);

      const incidentsRes = await axios.get(`${API_URL}/api/incidents`);
      setIncidents(incidentsRes.data);

      fetchAnalytics();
    } catch (err) {
      console.warn('Backend connecting...');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/analytics`);
      setAnalytics(res.data);
    } catch (err) {}
  };

  const initBillingForm = (order: any) => {
    if (!order) return;
    const b = order.billingDetails || {};
    setEditFreightBase(b.freightBase || 15000);
    setEditStorageFee(b.storageFee || 0);
    setEditHandlingFee(b.handlingFee || 1250);
    setEditTollSurcharge(b.tollSurcharge || 850);
    setEditNotes(b.notes || 'Official B2B Freight & Warehouse Storage Quotation');
  };

  const handleOrderSelect = async (order: any) => {
    setSelectedOrder(order);
    initBillingForm(order);
    setDriverMatches([]);
    
    if (order.status === 'confirmed' || order.status === 'dispatch_requested') {
      // Find matching heavy trucks stationed near the source pickup terminal
      setLoadingMatches(true);
      try {
        const res = await axios.post(`${API_URL}/api/orders/match`, { orderId: order.orderId });
        setDriverMatches(res.data.matches);
      } catch (err) {
        console.warn('Matching failed.');
      } finally {
        setLoadingMatches(false);
      }
    }
  };

  const handlePresentBill = async () => {
    if (!selectedOrder) return;
    setPresentingBill(true);
    try {
      const res = await axios.post(`${API_URL}/api/orders/${selectedOrder.orderId}/present-bill`, {
        freightBase: editFreightBase,
        storageFee: editStorageFee,
        handlingFee: editHandlingFee,
        tollSurcharge: editTollSurcharge,
        notes: editNotes
      });
      setSelectedOrder(res.data);
      setOrders(prev => prev.map(o => o.orderId === res.data.orderId ? res.data : o));
    } catch (err) {
      alert('Failed to present bill.');
    } finally {
      setPresentingBill(false);
    }
  };

  // Dispatcher sends request to the chosen driver at the source hub
  const handleSendDispatchRequest = async (driverId: string) => {
    if (!selectedOrder) return;
    setSendingDispatch(true);
    try {
      const res = await axios.post(`${API_URL}/api/orders/${selectedOrder.orderId}/send-dispatch-request`, {
        driverId: driverId
      });
      setSelectedOrder(res.data.order);
      setOrders(prev => prev.map(o => o.orderId === res.data.order.orderId ? res.data.order : o));
    } catch (err) {
      alert('Failed to transmit dispatch request.');
    } finally {
      setSendingDispatch(false);
    }
  };


  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'quotes') return o.status === 'pending_quote' || o.status === 'quoted';
    if (orderFilter === 'confirmed') return o.status === 'confirmed' || o.status === 'dispatch_requested';
    if (orderFilter === 'active') return ['assigned', 'picked_up', 'out_for_delivery'].includes(o.status);
    if (orderFilter === 'completed') return o.status === 'completed';
    return true;
  });

  const activeDriverObj = selectedOrder && selectedOrder.driverId 
    ? drivers.find((d: any) => d.driverId === selectedOrder.driverId) 
    : null;

  return (
    <div className="flex-1 min-h-screen bg-zinc-950 flex flex-col text-zinc-100 font-sans">
      
      {/* Top Navigation */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 rounded-xl">
            <Warehouse className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-wide text-white">QUANTUM<span className="text-cyan-400">EXPRESS</span></span>
              <span className="text-xs font-semibold text-zinc-300 border-l border-zinc-700 pl-2">Dispatcher Control Tower</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold px-2 py-0.5 rounded-full">16 State Logistics Hubs</span>
            </div>
            <span className="text-xs text-zinc-400">Enterprise B2B Freight & State Warehousing Logistics Platform</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Commercial Fleet: <strong>{drivers.length} Trucks Active</strong></span>
          </div>

          <button 
            onClick={handleLogout}
            className="p-2 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 space-y-6 max-w-[1700px] w-full mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* KPI Strip */}
        <section className="xl:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Freight & Storage Revenue</span>
              <p className="text-xl font-black text-white">₹{analytics.totalRevenue?.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
              <Truck className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Active Heavy Trucks</span>
              <p className="text-xl font-black text-white">{analytics.activeOrders || orders.filter(o => ['assigned', 'out_for_delivery'].includes(o.status)).length} En Route</p>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <Warehouse className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Active Terminals & Ports</span>
              <p className="text-xl font-black text-white">16 Hubs</p>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <FileText className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Ready for Dispatch</span>
              <p className="text-xl font-black text-emerald-400">{orders.filter(o => o.status === 'confirmed').length}</p>
            </div>
          </div>
        </section>

        {/* Left Column: Orders & Dispatcher Actions (4 Cols) */}
        <section className="xl:col-span-4 space-y-4">
          
          {/* Order List & Filter Tabs */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" /> Consignments & Quotations
              </h2>
              <span className="text-xs text-zinc-500 font-bold">{filteredOrders.length} records</span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              {(['all', 'quotes', 'confirmed', 'active', 'completed'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setOrderFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-semibold transition-all whitespace-nowrap ${
                    orderFilter === tab ? 'bg-cyan-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {tab === 'quotes' ? 'Quotations' : tab === 'confirmed' ? 'Ready for Dispatch' : tab}
                </button>
              ))}
            </div>

            {/* Orders Scroll List */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-xs">No orders in this view.</div>
              ) : (
                filteredOrders.map(order => (
                  <div
                    key={order.orderId}
                    onClick={() => handleOrderSelect(order)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      selectedOrder?.orderId === order.orderId
                        ? 'bg-zinc-800/90 border-cyan-500/80 shadow-lg shadow-cyan-500/5'
                        : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white font-mono">{order.orderId}</span>
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        order.status === 'pending_quote' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                        order.status === 'quoted' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
                        order.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        order.status === 'dispatch_requested' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 animate-pulse' :
                        order.status === 'assigned' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' :
                        order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                        'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 truncate">
                      <span className="truncate">{order.customerName}</span>
                      {order.businessCode && (
                        <span className="text-[9px] font-mono font-bold bg-zinc-800 text-cyan-400 px-1.5 py-0.5 rounded border border-zinc-700">
                          {order.businessCode}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
                      <span>{order.package?.weight || 10} MT • {order.package?.type || 'Cargo'}</span>
                      <span className="font-bold text-cyan-400">₹{order.price?.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Box: Quotation Presenter OR Source Driver Dispatcher */}
          {selectedOrder && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
              
              {/* If Order is in Quotation Phase */}
              {(selectedOrder.status === 'pending_quote' || selectedOrder.status === 'quoted') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-400" /> Dispatcher Quotation Presenter
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-mono">{selectedOrder.orderId}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-zinc-500 text-[9px] uppercase font-bold mb-1">Freight Base (₹)</label>
                        <input
                          type="number"
                          value={editFreightBase}
                          onChange={(e) => setEditFreightBase(parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-500 text-[9px] uppercase font-bold mb-1">Warehouse Storage (₹)</label>
                        <input
                          type="number"
                          value={editStorageFee}
                          onChange={(e) => setEditStorageFee(parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-zinc-500 text-[9px] uppercase font-bold mb-1">Handling / Forklift (₹)</label>
                        <input
                          type="number"
                          value={editHandlingFee}
                          onChange={(e) => setEditHandlingFee(parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-500 text-[9px] uppercase font-bold mb-1">NHAI Toll Surcharge (₹)</label>
                        <input
                          type="number"
                          value={editTollSurcharge}
                          onChange={(e) => setEditTollSurcharge(parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePresentBill}
                    disabled={presentingBill}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Send className="w-3.5 h-3.5" /> Present / Update Bill to Shipper
                  </button>
                </div>
              )}

              {/* If Order is Confirmed -> Source Terminal Driver Matcher */}
              {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'dispatch_requested') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> Dispatch to Source Hub Driver
                      </h3>
                      <span className="text-[11px] text-zinc-400 block mt-0.5">Origin: <strong>{selectedOrder.pickup?.address}</strong></span>
                    </div>
                    <button
                      onClick={() => handleOrderSelect(selectedOrder)}
                      className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                  </div>

                  {selectedOrder.status === 'dispatch_requested' && (
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-xs space-y-1">
                      <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-indigo-400 animate-spin" /> Dispatch Request Transmitted!
                      </span>
                      <p className="text-zinc-400 text-[11px]">
                        Waiting for source truck driver <strong>{selectedOrder.dispatchRequestedDriverName || 'Driver'}</strong> to accept load and confirm pickup bay.
                      </p>
                    </div>
                  )}

                  {/* Scored Source Drivers */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {loadingMatches ? (
                      <div className="text-xs text-zinc-500 text-center py-4">Scanning Tamil Nadu fleet for source terminal drivers...</div>
                    ) : driverMatches.length === 0 ? (
                      <div className="text-xs text-zinc-500 text-center py-4">Click Refresh to find stationed heavy trucks</div>
                    ) : (
                      driverMatches.map((m: any, idx: number) => (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-2xl border transition-all text-xs space-y-2 ${
                            m.isSourceDriver 
                              ? 'bg-cyan-950/20 border-cyan-500/40' 
                              : 'bg-zinc-950 border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white">{m.driver.name}</span>
                                {m.isSourceDriver && (
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold">
                                    ★ Source Hub
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-zinc-400">{m.driver.vehicleType} • {m.driver.vehicleId}</span>
                            </div>
                            <span className="text-xs font-bold text-cyan-400">{m.score}% Match</span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                            <span className="text-[10px] text-zinc-500">{m.distance.toFixed(1)} km from loading bay • ETA ~{Math.round(m.eta)}m</span>
                            <button
                              onClick={() => handleSendDispatchRequest(m.driver.driverId)}
                              disabled={sendingDispatch || (selectedOrder.status === 'dispatch_requested' && selectedOrder.dispatchRequestedDriverId === m.driver.driverId)}
                              className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold rounded-lg text-xs transition-all shadow-sm flex items-center gap-1"
                            >
                              <Send className="w-3 h-3 text-zinc-950" /> Send Dispatch Request
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* If Order is Assigned */}
              {selectedOrder.status === 'assigned' && activeDriverObj && (
                <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Driver Accepted Load!
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">{activeDriverObj.vehicleId}</span>
                  </div>
                  <p className="text-zinc-300">
                    <strong>{activeDriverObj.name}</strong> has confirmed consignment pickup. Route navigation active.
                  </p>
                </div>
              )}

            </div>
          )}

        </section>

        {/* Center / Right Column: Tamil Nadu 16-Hub Map & Operations Tower (8 Cols) */}
        <section className="xl:col-span-8 space-y-6">
          
          {/* Interactive Map */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-4 h-[500px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-6 left-6 z-20 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-3 py-1.5 rounded-xl text-xs text-zinc-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Tamil Nadu Live Logistics Grid (16 Warehouses & Port CFS)</span>
            </div>
            
            <TrackingMap 
              pickupLocation={selectedOrder?.pickup}
              dropLocation={selectedOrder?.drop}
              driverLocation={activeDriverObj?.currentLocation}
              routeCoordinates={selectedOrder?.routeCoordinates || []}
              routeInfo={{
                originName: selectedOrder?.pickup?.address,
                destName: selectedOrder?.drop?.address,
                distanceKm: selectedOrder?.distanceKm,
                status: selectedOrder?.status,
                vehicleId: activeDriverObj?.vehicleId
              }}
              otherDrivers={drivers}
              showWarehouses={true}
            />
          </div>

          {/* Bottom Grid: Tamil Nadu 16 Terminals Fleet Status & Live Incidents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Tamil Nadu 16 Terminals Fleet Capacity */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-cyan-400" /> Terminal & Port CFS Fleet Capacity
                </h3>
                <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  16 Hubs Online
                </span>
              </div>

              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {TAMIL_NADU_WAREHOUSES.map((wh) => (
                  <div key={wh.id} className="p-2 bg-zinc-950/80 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{wh.name}</span>
                      <span className="text-[10px] text-zinc-500">{wh.type} • {wh.storageTypes.join(', ')}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-cyan-400 block">{wh.activeFleet} Trucks</span>
                      <span className="text-[9px] text-zinc-500">{wh.capacityTonnes} MT Cap</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Incidents & Route Deviations */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> Real-Time Freight Incidents
                </h3>
                <span className="text-xs text-zinc-500 font-bold">{incidents.length} active</span>
              </div>

              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {incidents.length === 0 ? (
                  <div className="text-xs text-zinc-600 text-center py-8">All Tamil Nadu freight corridors operating normally.</div>
                ) : (
                  incidents.map((inc, idx) => (
                    <div key={idx} className="p-2.5 bg-zinc-950 border border-rose-500/30 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-400 uppercase text-[10px]">{inc.type.replace('_', ' ')}</span>
                        <span className="text-zinc-600 text-[9px]">{inc.incidentId}</span>
                      </div>
                      <p className="text-zinc-300 text-[11px]">{inc.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </section>

      </main>

    </div>
  );
}
