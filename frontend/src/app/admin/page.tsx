'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, AlertTriangle, Play, RefreshCw, BarChart3, 
  MapPin, User, LogOut, TrendingUp, Compass, Cpu, 
  Zap, CheckCircle2, DollarSign, Leaf, RefreshCcw,
  Truck, Warehouse, FileText, Send, Check, X, Building2, Anchor
} from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { TAMIL_NADU_WAREHOUSES } from '../constants/locations';

const Map = dynamic(() => import('../components/Map'), { ssr: false });
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
  const [socket, setSocket] = useState<any>(null);

  // Dispatcher Quotation & Billing customizer
  const [editFreightBase, setEditFreightBase] = useState<number>(0);
  const [editStorageFee, setEditStorageFee] = useState<number>(0);
  const [editHandlingFee, setEditHandlingFee] = useState<number>(0);
  const [editTollSurcharge, setEditTollSurcharge] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');
  const [presentingBill, setPresentingBill] = useState(false);

  // Simulation states
  const [simDemand, setSimDemand] = useState(30);
  const [simDrivers, setSimDrivers] = useState(5);
  const [simResult, setSimResult] = useState<any | null>(null);
  const [simulating, setSimulating] = useState(false);

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
    
    if (order.status === 'confirmed') {
      // Find matching heavy trucks
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

  const handleAssignDriver = async (driverId: string) => {
    if (!selectedOrder) return;
    try {
      const res = await axios.post(`${API_URL}/api/orders/assign`, {
        orderId: selectedOrder.orderId,
        driverId: driverId
      });
      setSelectedOrder(res.data);
      setOrders(prev => prev.map(o => o.orderId === res.data.orderId ? res.data : o));
      setDriverMatches([]);
    } catch (err) {
      alert('Failed to assign heavy truck.');
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    try {
      const res = await axios.post(`${API_URL}/api/analytics/simulate`, {
        demandIncreasePercent: simDemand,
        additionalDrivers: simDrivers,
        zoneAlert: 'Tamil Nadu Logistics Grid'
      });
      setSimResult(res.data);
    } catch (err) {
      alert('Simulation error.');
    } finally {
      setSimulating(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'quotes') return o.status === 'pending_quote' || o.status === 'quoted';
    if (orderFilter === 'confirmed') return o.status === 'confirmed';
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
              <span className="text-base font-extrabold tracking-wide text-white">TAMIL NADU FREIGHT CONTROL TOWER</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold px-2 py-0.5 rounded-full">16 Terminals & Ports</span>
            </div>
            <span className="text-xs text-zinc-400">Dispatcher Command Station • Heavy Fleet & Warehouse Billing</span>
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
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Quotes Awaiting Decision</span>
              <p className="text-xl font-black text-amber-400">{orders.filter(o => o.status === 'pending_quote' || o.status === 'quoted').length}</p>
            </div>
          </div>
        </section>

        {/* Left Column: Orders & B2B Billing Presenter (4 Cols) */}
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
                  {tab === 'quotes' ? 'Quotations' : tab}
                </button>
              ))}
            </div>

            {/* Orders Scroll List */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
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
                        order.status === 'assigned' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                        order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                        'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-zinc-300 truncate">{order.customerName}</p>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
                      <span>{order.package?.weight || 10} MT • {order.package?.type || 'Cargo'}</span>
                      <span className="font-bold text-cyan-400">₹{order.price?.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quotation & Bill Presenter Box (When Order is Selected) */}
          {selectedOrder && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" /> Dispatcher Quotation Presenter
                </h3>
                <span className="text-[10px] text-zinc-400 font-mono">{selectedOrder.orderId}</span>
              </div>

              {/* Status info */}
              <div className="flex items-center justify-between text-xs bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-zinc-400">Shipper Decision:</span>
                <span className={`font-bold capitalize ${
                  selectedOrder.quotationStatus === 'accepted' ? 'text-emerald-400' :
                  selectedOrder.quotationStatus === 'rejected' ? 'text-rose-400' :
                  selectedOrder.quotationStatus === 'quoted' ? 'text-cyan-400 animate-pulse' :
                  'text-amber-400'
                }`}>
                  {selectedOrder.quotationStatus === 'pending_quote' ? 'Awaiting Dispatcher Bill' :
                   selectedOrder.quotationStatus === 'quoted' ? 'Quotation Sent to Shipper' :
                   selectedOrder.quotationStatus === 'accepted' ? 'Accepted by Shipper (Ready for Dispatch)' :
                   'Declined by Shipper'}
                </span>
              </div>

              {/* Bill Line-Item Inputs */}
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

                <div>
                  <label className="block text-zinc-500 text-[9px] uppercase font-bold mb-1">Dispatcher Remarks</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Custom logistics terms..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Action Button */}
              {selectedOrder.status === 'pending_quote' || selectedOrder.status === 'quoted' ? (
                <button
                  onClick={handlePresentBill}
                  disabled={presentingBill}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Send className="w-3.5 h-3.5" /> Present / Update Official Bill to Shipper
                </button>
              ) : null}

              {/* Heavy Truck Matching (If Shipper Accepted Bill) */}
              {selectedOrder.status === 'confirmed' && (
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Bill Accepted: Dispatch Heavy Truck
                    </span>
                    <button
                      onClick={() => handleOrderSelect(selectedOrder)}
                      className="text-[10px] text-cyan-400 hover:underline"
                    >
                      Refresh Scoring
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {loadingMatches ? (
                      <div className="text-xs text-zinc-500 text-center py-2">Computing AI scoring matrix...</div>
                    ) : driverMatches.length === 0 ? (
                      <div className="text-xs text-zinc-500 text-center py-2">Click below to find heavy trucks</div>
                    ) : (
                      driverMatches.map((m: any, idx: number) => (
                        <div key={idx} className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-white block">{m.driver.name}</span>
                            <span className="text-[10px] text-zinc-500">{m.driver.vehicleType} • Match {m.score}%</span>
                          </div>
                          <button
                            onClick={() => handleAssignDriver(m.driver.driverId)}
                            className="px-3 py-1 bg-cyan-500 text-zinc-950 font-bold rounded-lg text-xs hover:bg-cyan-400"
                          >
                            Assign Truck
                          </button>
                        </div>
                      ))
                    )}
                  </div>
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
            
            <Map 
              pickupLocation={selectedOrder?.pickup}
              dropLocation={selectedOrder?.drop}
              driverLocation={activeDriverObj?.currentLocation}
              routeCoordinates={selectedOrder?.routeCoordinates || []}
              otherDrivers={drivers}
              showWarehouses={true}
            />
          </div>

          {/* Bottom Grid: What-If Simulator & Incidents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* What-If Operations Simulator */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" /> Tamil Nadu Fleet What-If Simulator
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-zinc-500 text-[10px] font-bold uppercase block mb-1">Surge Demand (+%)</label>
                  <input
                    type="number"
                    value={simDemand}
                    onChange={(e) => setSimDemand(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 text-[10px] font-bold uppercase block mb-1">Additional Trucks</label>
                  <input
                    type="number"
                    value={simDrivers}
                    onChange={(e) => setSimDrivers(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={simulating}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all"
              >
                {simulating ? 'Simulating Capacity...' : 'Simulate Logistics Surge'}
              </button>

              {simResult && (
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Required Heavy Trucks:</span>
                    <span className="font-bold text-white">{simResult.required_vehicles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Projected SLA Compliance:</span>
                    <span className="font-bold text-emerald-400">{simResult.expected_sla_percent}%</span>
                  </div>
                </div>
              )}
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
                  <div className="text-xs text-zinc-600 text-center py-6">All Tamil Nadu freight routes operating normally.</div>
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
