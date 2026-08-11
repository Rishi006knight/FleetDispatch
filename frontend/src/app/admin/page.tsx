'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, AlertTriangle, Play, RefreshCw, BarChart3, 
  MapPin, User, LogOut, TrendingUp, Compass, Cpu, 
  Zap, CheckCircle2, DollarSign, Leaf, RefreshCcw 
} from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet Map to avoid Next.js SSR window error
const Map = dynamic(() => import('../components/Map'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function AdminDashboard() {
  const router = useRouter();
  
  // Real-time states
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    totalRevenue: 18450,
    activeOrders: 0,
    slaCompliance: 94,
    carbonEmissionsKg: 142.3,
    driverLeaderboard: []
  });

  // UI Selection states
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [driverMatches, setDriverMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  // Simulation states
  const [simDemand, setSimDemand] = useState(30);
  const [simDrivers, setSimDrivers] = useState(5);
  const [simResult, setSimResult] = useState<any | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Initialize and load data
  useEffect(() => {
    // Check auth role
    const role = localStorage.getItem('user_role');
    if (role !== 'admin') {
      router.push('/');
      return;
    }

    // Connect to websocket
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Initial API calls
    fetchData();

    // Listen for WebSocket events
    newSocket.on('connect', () => {
      console.log('Admin connected to WebSocket server');
      newSocket.emit('join_room', 'admin');
    });

    newSocket.on('ORDER_CREATED', (order) => {
      setOrders(prev => [order, ...prev]);
      fetchAnalytics();
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
      // Dynamic GPS updates to markers
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

      const driversRes = await axios.get(`${API_URL}/api/drivers`);
      setDrivers(driversRes.data);

      const incidentsRes = await axios.get(`${API_URL}/api/incidents`);
      setIncidents(incidentsRes.data);

      fetchAnalytics();
    } catch (err) {
      console.error('Failed to fetch initial operational data, loading demo seed.');
      // Seed data if API is down / starting up
      setOrders([
        {
          orderId: "ORD-842910",
          customerName: "Alice Smith",
          pickup: { lat: 19.076, lng: 72.877, address: "Bandra Kurla Complex" },
          drop: { lat: 19.113, lng: 72.869, address: "Andheri East" },
          package: { weight: 2.5, type: "documents" },
          priority: "high",
          price: 180,
          status: "pending",
          driverId: null,
          eta: 25,
          riskScore: { delayProb: 0.12, theftProb: 0.02, failedProb: 0.05, overall: 0.06 }
        }
      ]);
      setDrivers([
        { driverId: "DRV-101", name: "Rohan Sharma", vehicleType: "bike", status: "online", currentLocation: { lat: 19.082, lng: 72.882 }, rating: 4.8, reliability: 0.95, churnRisk: 0.15, earnings: 1200, completedDeliveries: 34 },
        { driverId: "DRV-102", name: "Amit Kumar", vehicleType: "car", status: "online", currentLocation: { lat: 19.065, lng: 72.859 }, rating: 4.6, reliability: 0.92, churnRisk: 0.45, earnings: 2400, completedDeliveries: 28 },
        { driverId: "DRV-103", name: "Vikram Singh", vehicleType: "scooter", status: "busy", currentLocation: { lat: 19.102, lng: 72.875 }, rating: 4.9, reliability: 0.98, churnRisk: 0.02, earnings: 1850, completedDeliveries: 42 }
      ]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/analytics`);
      setAnalytics(res.data);
    } catch (err) {
      // Keep state
    }
  };

  const handleOrderSelect = async (order: any) => {
    setSelectedOrder(order);
    setDriverMatches([]);
    if (order.status !== 'pending') return;

    setLoadingMatches(true);
    try {
      const res = await axios.post(`${API_URL}/api/orders/match`, { orderId: order.orderId });
      setDriverMatches(res.data.matches);
    } catch (err) {
      console.warn('Driver match failed, loading static mock matches');
      // Simple fallback matching
      setDriverMatches([
        { driver: drivers[0], distance: 1.5, eta: 5, score: 92 },
        { driver: drivers[1], distance: 3.2, eta: 10, score: 78 }
      ]);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleAssignDriver = async (driverId: string) => {
    if (!selectedOrder) return;
    try {
      await axios.post(`${API_URL}/api/orders/assign`, {
        orderId: selectedOrder.orderId,
        driverId
      });
      // reload
      fetchData();
    } catch (err) {
      alert('Error assigning driver.');
    }
  };

  const handleResolveIncident = async (incidentId: string) => {
    try {
      await axios.put(`${API_URL}/api/incidents/${incidentId}/resolve`);
      setIncidents(prev => prev.map(i => i.incidentId === incidentId ? { ...i, status: 'resolved' } : i));
    } catch (err) {
      // fallback
      setIncidents(prev => prev.filter(i => i.incidentId !== incidentId));
    }
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const res = await axios.post(`${API_URL}/api/analytics/simulate`, {
        additionalDrivers: simDrivers,
        demandIncreasePercent: simDemand,
        zone: 'all'
      });
      setSimResult(res.data);
    } catch (err) {
      // Local calculation fallback
      setSimResult({
        required_vehicles: Math.round(drivers.length * (1 + simDemand/100)),
        expected_sla_percent: Math.max(50, 94 - simDemand * 0.4 + simDrivers * 1.5),
        additional_drivers_required: Math.max(0, Math.round(simDemand * 0.2 - simDrivers)),
        estimated_revenue_increase: Math.round(simDemand * 350),
        carbon_saved_kg: Math.round(simDemand * 1.2),
        message: 'Analytical fallback simulation computed.'
      });
    } finally {
      setSimulating(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  // Setup bounds and coordinates for maps
  const activeDriverObj = selectedOrder && selectedOrder.driverId 
    ? drivers.find(d => d.driverId === selectedOrder.driverId) 
    : null;
    
  const mapDriverLoc = activeDriverObj ? activeDriverObj.currentLocation : null;

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 min-h-screen">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              QUANTUMEXPRESS <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20 font-semibold uppercase tracking-wider">Dispatcher Cockpit</span>
            </h1>
            <p className="text-[10px] text-zinc-500">Autonomous Fleet Orchestration & Analytics Control Room</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="block text-xs font-semibold text-white">System Dispatcher</span>
            <span className="block text-[10px] text-emerald-400 flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Control Node Active
            </span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 bg-zinc-800 hover:bg-rose-950/40 hover:text-rose-400 border border-zinc-700 hover:border-rose-900/50 rounded-xl transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* KPI Cards Row */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-zinc-500 text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
              <span className="block text-2xl font-bold mt-1 text-white">₹{analytics.totalRevenue.toLocaleString()}</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" /> +14.2% from yesterday
              </span>
            </div>
            <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          
          <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-zinc-500 text-xs font-semibold uppercase tracking-wider">Active Deliveries</span>
              <span className="block text-2xl font-bold mt-1 text-white">{analytics.activeOrders}</span>
              <span className="text-[10px] text-cyan-400 flex items-center gap-1 mt-1">
                <Compass className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} /> Live tracking enabled
              </span>
            </div>
            <div className="p-3.5 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
              <Cpu className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-zinc-500 text-xs font-semibold uppercase tracking-wider">SLA Compliance</span>
              <span className="block text-2xl font-bold mt-1 text-white">{analytics.slaCompliance}%</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" /> Target threshold 92%
              </span>
            </div>
            <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <Zap className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-zinc-500 text-xs font-semibold uppercase tracking-wider">Carbon Footprint</span>
              <span className="block text-2xl font-bold mt-1 text-white">{analytics.carbonEmissionsKg} kg</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                <Leaf className="w-3 h-3" /> Route optimization offset
              </span>
            </div>
            <div className="p-3.5 bg-teal-500/10 text-teal-400 rounded-2xl border border-teal-500/20">
              <Leaf className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* Live Operational Grid: Map on Left, Dispatch on Right */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Map Container */}
          <div className="lg:col-span-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> Live Fleet Telemetry Map
              </h2>
              <span className="text-zinc-500 text-xs">Showing {drivers.filter(d=>d.status==='online').length} online drivers</span>
            </div>
            
            <div className="flex-1 h-[450px] relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950">
              {/* Load Map with active order points */}
              <Map 
                driverLocation={mapDriverLoc}
                pickupLocation={selectedOrder ? selectedOrder.pickup : null}
                dropLocation={selectedOrder ? selectedOrder.drop : null}
                routeCoordinates={selectedOrder ? selectedOrder.routeCoordinates : []}
                otherDrivers={drivers}
              />
            </div>
          </div>

          {/* Dispatch Center */}
          <div className="lg:col-span-4 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 flex flex-col h-[520px]">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
              Dispatch Center
              <button 
                onClick={fetchData}
                className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded-md border border-zinc-700 text-zinc-300 transition-all"
                title="Refresh Queue"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
              </button>
            </h2>
            
            {/* Scrollable Order Queue */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {orders.filter(o => o.status === 'pending').length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-zinc-700 mb-2" />
                  <p className="text-xs">No pending orders. Queue is clear!</p>
                </div>
              ) : (
                orders.filter(o => o.status === 'pending').map((order) => (
                  <div 
                    key={order.orderId}
                    onClick={() => handleOrderSelect(order)}
                    className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                      selectedOrder && selectedOrder.orderId === order.orderId
                        ? 'bg-cyan-950/20 border-cyan-500/60 shadow-lg shadow-cyan-500/5'
                        : 'bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/20'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-white">{order.orderId}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        order.priority === 'high' 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {order.priority}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{order.pickup.address}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate">{order.drop.address}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-zinc-900 flex justify-between items-center text-xs">
                      <span className="font-semibold text-cyan-400">₹{order.price}</span>
                      <span className="text-[10px] text-zinc-500">Risk: {Math.round(order.riskScore.overall * 100)}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selection match panel */}
            {selectedOrder && selectedOrder.status === 'pending' && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  AI Matching Candidates
                </h3>
                
                {loadingMatches ? (
                  <div className="py-4 flex justify-center text-zinc-500 text-xs items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> Calculating score matrices...
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {driverMatches.map((match) => (
                      <div 
                        key={match.driver.driverId}
                        className="flex items-center justify-between p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl"
                      >
                        <div>
                          <span className="block text-xs font-bold text-white">{match.driver.name}</span>
                          <span className="block text-[10px] text-zinc-500">
                            Dist: {match.distance.toFixed(1)} km | ETA: {Math.round(match.eta)} mins
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-cyan-400">{match.score}% match</span>
                          <button
                            onClick={() => handleAssignDriver(match.driver.driverId)}
                            className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Bottom Section: What-if Simulation on Left, Incident Feed on Right */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Simulation Console */}
          <div className="lg:col-span-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 flex flex-col">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" /> Operational What-If Simulator
            </h2>
            
            <div className="grid grid-cols-2 gap-4 flex-1">
              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400 font-medium">Demand Surge</span>
                    <span className="text-cyan-400 font-bold">+{simDemand}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={simDemand}
                    onChange={(e)=>setSimDemand(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400 font-medium">Additional Drivers</span>
                    <span className="text-cyan-400 font-bold">+{simDrivers}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="50" 
                    value={simDrivers}
                    onChange={(e)=>setSimDrivers(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <button
                  onClick={runSimulation}
                  disabled={simulating}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {simulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Execute Model Run
                </button>
              </div>

              {/* Outputs */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-center text-xs">
                {simResult ? (
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                      <span className="text-zinc-500">Expected SLA:</span>
                      <span className="font-bold text-white">{simResult.expected_sla_percent}%</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                      <span className="text-zinc-500">Required Fleet Size:</span>
                      <span className="font-bold text-white">{simResult.required_vehicles}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                      <span className="text-zinc-500">Shortfall:</span>
                      <span className="font-bold text-rose-400">+{simResult.additional_drivers_required} drivers</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                      <span className="text-zinc-500">Revenue Impact:</span>
                      <span className="font-bold text-emerald-400">+₹{simResult.estimated_revenue_increase}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 italic mt-2 text-center">{simResult.message}</p>
                  </div>
                ) : (
                  <div className="text-zinc-500 text-center py-6">
                    Adjust simulation parameters and execute model.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Incident Alert Feed */}
          <div className="lg:col-span-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 flex flex-col max-h-[300px]">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> Operational Incident Feed
            </h2>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {incidents.filter(i => i.status === 'open').length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-zinc-800 mb-1" /> No active alerts or exceptions.
                </div>
              ) : (
                incidents.filter(i => i.status === 'open').map((incident) => (
                  <div 
                    key={incident.incidentId}
                    className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-start justify-between gap-4"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 border border-rose-500/10 px-1.5 py-0.5 rounded-md mr-2">
                        {incident.type.replace('_', ' ')}
                      </span>
                      <span className="text-zinc-400 text-xs font-medium">{incident.message}</span>
                      <span className="block text-[9px] text-zinc-600 mt-1">Alert ID: {incident.incidentId}</span>
                    </div>
                    <button
                      onClick={() => handleResolveIncident(incident.incidentId)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-zinc-700 shrink-0 transition-all"
                    >
                      Resolve
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
