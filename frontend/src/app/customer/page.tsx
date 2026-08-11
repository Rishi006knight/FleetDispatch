'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, MapPin, Truck, ChevronRight, LogOut, 
  Map, DollarSign, Clock, CheckCircle2, ShieldAlert,
  ArrowRight, ShieldCheck, ShoppingBag
} from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet Map to avoid Next.js SSR window error
const TrackingMap = dynamic(() => import('../components/Map'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Preset Routes to make demo booking easy without typing coordinates
const PRESET_ROUTES = [
  {
    name: "BKC Office to Andheri East",
    pickup: { lat: 19.0660, lng: 72.8680, address: "Bandra Kurla Complex (BKC), Mumbai" },
    drop: { lat: 19.1130, lng: 72.8690, address: "Marol Metro, Andheri East, Mumbai" }
  },
  {
    name: "Dadar Market to Bandra West",
    pickup: { lat: 19.0178, lng: 72.8478, address: "Dadar Flower Market, Mumbai" },
    drop: { lat: 19.0544, lng: 72.8406, address: "Carter Road, Bandra West, Mumbai" }
  },
  {
    name: "Powai Lake to Ghatkopar Station",
    pickup: { lat: 19.1290, lng: 72.9010, address: "Hiranandani Gardens, Powai, Mumbai" },
    drop: { lat: 19.0860, lng: 72.9080, address: "Ghatkopar Station West, Mumbai" }
  }
];

export default function CustomerPortal() {
  const router = useRouter();
  
  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [packageWeight, setPackageWeight] = useState(1.5);
  const [packageType, setPackageType] = useState('electronics');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  
  // Operational states
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);

  // UI state
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    const name = localStorage.getItem('user_name') || 'Guest Customer';
    
    if (role !== 'customer') {
      router.push('/');
      return;
    }

    setCustomerName(name);
    setCustomerPhone('9988776655');

    // Connect to websocket
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Initial load
    fetchData();

    newSocket.on('connect', () => {
      console.log('Customer connected to WebSocket');
      newSocket.emit('join_room', 'customer');
    });

    newSocket.on('ORDER_ASSIGNED', ({ order }: any) => {
      setOrders(prev => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder(prev => prev && prev.orderId === order.orderId ? order : prev);
    });

    newSocket.on('ORDER_STATUS_UPDATED', (order: any) => {
      setOrders(prev => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder(prev => prev && prev.orderId === order.orderId ? order : prev);
    });

    newSocket.on('DRIVER_UPDATED', (driver: any) => {
      setDrivers(prev => prev.map(d => d.driverId === driver.driverId ? driver : d));
    });

    newSocket.on('TELEMETRY_UPDATED', (data: any) => {
      // Dynamic GPS updates
      setDrivers(prev => prev.map(d => {
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

  const fetchData = async () => {
    try {
      const ordersRes = await axios.get(`${API_URL}/api/orders`);
      setOrders(ordersRes.data);

      const driversRes = await axios.get(`${API_URL}/api/drivers`);
      setDrivers(driversRes.data);
    } catch (err) {
      console.error('Failed to load customer orders.');
    }
  };

  const handleBookOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingStatus('loading');

    const route = PRESET_ROUTES[selectedRouteIdx];

    try {
      const res = await axios.post(`${API_URL}/api/orders`, {
        customerName,
        customerPhone,
        pickup: route.pickup,
        drop: route.drop,
        packageWeight,
        packageType,
        priority
      });

      setOrders(prev => [res.data, ...prev]);
      setSelectedOrder(res.data);
      setBookingStatus('success');
      
      setTimeout(() => {
        setBookingStatus('idle');
      }, 2000);
    } catch (err) {
      alert('Error creating order.');
      setBookingStatus('idle');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const activeDriverObj = selectedOrder && selectedOrder.driverId 
    ? drivers.find((d: any) => d.driverId === selectedOrder.driverId) 
    : null;
    
  const mapDriverLoc = activeDriverObj ? activeDriverObj.currentLocation : null;

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 min-h-screen">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
            <User className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Customer Portal</h1>
            <span className="block text-[10px] text-zinc-500">Welcome, {customerName}</span>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="p-2 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"
          title="Logout"
        >
          <LogOut className="w-4 h-4 text-rose-500" />
        </button>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 space-y-6 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Order Booking Form */}
        <section className="lg:col-span-5 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-cyan-400" /> Book Package Delivery
          </h2>

          <form onSubmit={handleBookOrder} className="space-y-4">
            <div>
              <label className="block text-zinc-500 text-[10px] font-bold uppercase mb-1">Select Delivery Route</label>
              <select
                value={selectedRouteIdx}
                onChange={(e) => setSelectedRouteIdx(parseInt(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {PRESET_ROUTES.map((route, idx) => (
                  <option key={idx} value={idx}>{route.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-500 text-[10px] font-bold uppercase mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={packageWeight}
                  onChange={(e) => setPackageWeight(parseFloat(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] font-bold uppercase mb-1">Type</label>
                <select
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="electronics">Electronics</option>
                  <option value="documents">Documents</option>
                  <option value="apparel">Apparel</option>
                  <option value="food">Perishables</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-zinc-500 text-[10px] font-bold uppercase mb-1.5">Delivery Speed</label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all capitalize ${
                      priority === p
                        ? 'bg-cyan-500 border-cyan-500 text-zinc-950'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    {p === 'high' ? 'Express' : p === 'medium' ? 'Standard' : 'Economy'}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={bookingStatus === 'loading'}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-zinc-950 font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
            >
              {bookingStatus === 'loading' ? 'Calculating pricing matrix...' : 'Book Delivery'}
            </button>

            {bookingStatus === 'success' && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Order Booked! Finding matched driver.
              </div>
            )}
          </form>

          {/* Customer History Orders */}
          <div className="pt-4 border-t border-zinc-800">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">My Orders</h3>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {orders.map((o) => (
                <div 
                  key={o.orderId}
                  onClick={() => setSelectedOrder(o)}
                  className={`p-3 border rounded-2xl cursor-pointer transition-all flex items-center justify-between ${
                    selectedOrder && selectedOrder.orderId === o.orderId
                      ? 'bg-cyan-950/15 border-cyan-500/40'
                      : 'bg-zinc-950/40 border-zinc-800/80 hover:bg-zinc-900/25'
                  }`}
                >
                  <div>
                    <span className="block text-xs font-bold text-white">{o.orderId}</span>
                    <span className="block text-[10px] text-zinc-500 truncate max-w-[180px]">{o.drop.address}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                    o.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : o.status === 'failed'
                      ? 'bg-rose-500/10 text-rose-400'
                      : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/10'
                  }`}>
                    {o.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Side: Map & Order Tracking */}
        <section className="lg:col-span-7 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 flex flex-col min-h-[500px]">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Map className="w-4 h-4 text-cyan-400" /> Live Order Tracking
          </h2>

          {selectedOrder ? (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Stepper Status Indicator */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-zinc-500 uppercase tracking-wider text-[9px]">Status</span>
                    <span className="font-bold text-white uppercase tracking-wider">{selectedOrder.status.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-zinc-500 uppercase tracking-wider text-[9px]">AI Predicted ETA</span>
                    <span className="font-bold text-white">{selectedOrder.eta} mins</span>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="flex-1 h-[320px] border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950">
                <TrackingMap 
                  driverLocation={mapDriverLoc}
                  pickupLocation={selectedOrder.pickup}
                  dropLocation={selectedOrder.drop}
                  routeCoordinates={selectedOrder.routeCoordinates}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-center">
              <Truck className="w-12 h-12 text-zinc-800 mb-3 animate-pulse" />
              <p className="text-sm font-bold">No Active Tracking</p>
              <p className="text-xs text-zinc-600 mt-1 max-w-[260px]">
                Create a new package delivery or select one of your booked orders to view live updates.
              </p>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
