'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, MapPin, Truck, ChevronRight, LogOut, 
  DollarSign, Clock, CheckCircle2, ShieldAlert,
  ArrowRight, ShieldCheck, ShoppingBag, Warehouse, 
  FileText, Check, X, Building2, Anchor
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

export default function CustomerPortal() {
  const router = useRouter();
  
  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [customPickupWh, setCustomPickupWh] = useState(TAMIL_NADU_WAREHOUSES[0].id);
  const [customDropWh, setCustomDropWh] = useState(TAMIL_NADU_WAREHOUSES[4].id);
  const [useCustomWarehousePair, setUseCustomWarehousePair] = useState(false);

  // Cargo & Warehouse Storage states
  const [packageWeight, setPackageWeight] = useState(12.5); // in Metric Tonnes
  const [packageType, setPackageType] = useState('Heavy Machinery & Parts');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [storageType, setStorageType] = useState('None');
  const [storageDays, setStorageDays] = useState(3);
  const [requiresHandling, setRequiresHandling] = useState(true);
  
  // Operational states
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  // Quotation Bill Review Modal
  const [showBillModal, setShowBillModal] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    const name = localStorage.getItem('user_name') || 'Tamil Nadu Cargo Business';
    
    if (role !== 'customer') {
      router.push('/');
      return;
    }

    setCustomerName(name);
    setCustomerPhone('9840123456');

    // Connect to websocket
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Initial load
    fetchData();

    newSocket.on('connect', () => {
      newSocket.emit('join_room', 'customer');
    });

    newSocket.on('ORDER_CREATED', (order: any) => {
      setOrders(prev => [order, ...prev.filter(o => o.orderId !== order.orderId)]);
    });

    newSocket.on('BILL_QUOTED', (order: any) => {
      setOrders(prev => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder(prev => prev && prev.orderId === order.orderId ? order : prev);
      setShowBillModal(true);
    });

    newSocket.on('BILL_ACCEPTED', (order: any) => {
      setOrders(prev => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder(prev => prev && prev.orderId === order.orderId ? order : prev);
    });

    newSocket.on('BILL_REJECTED', (order: any) => {
      setOrders(prev => prev.map(o => o.orderId === order.orderId ? order : o));
      setSelectedOrder(prev => prev && prev.orderId === order.orderId ? order : prev);
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
      if (ordersRes.data.length > 0) {
        setSelectedOrder(ordersRes.data[0]);
      }

      const driversRes = await axios.get(`${API_URL}/api/drivers`);
      setDrivers(driversRes.data);
    } catch (err) {
      console.warn('Backend loading, initial fetch skipped.');
    }
  };

  const handleBookOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingStatus('loading');

    let pickupData;
    let dropData;
    let warehouseInfo: WarehouseLocation | undefined;

    if (useCustomWarehousePair) {
      const pWh = TAMIL_NADU_WAREHOUSES.find(w => w.id === customPickupWh)!;
      const dWh = TAMIL_NADU_WAREHOUSES.find(w => w.id === customDropWh)!;
      pickupData = { lat: pWh.lat, lng: pWh.lng, address: `${pWh.name} - ${pWh.address}` };
      dropData = { lat: dWh.lat, lng: dWh.lng, address: `${dWh.name} - ${dWh.address}` };
      warehouseInfo = storageType !== 'None' ? dWh : undefined;
    } else {
      const route = TAMIL_NADU_PRESET_ROUTES[selectedRouteIdx];
      pickupData = route.pickup;
      dropData = route.drop;
      warehouseInfo = TAMIL_NADU_WAREHOUSES[0];
    }

    try {
      const res = await axios.post(`${API_URL}/api/orders`, {
        customerName,
        customerPhone,
        pickup: pickupData,
        drop: dropData,
        packageWeight: packageWeight,
        packageType: packageType,
        priority: priority,
        warehouseId: warehouseInfo?.id,
        warehouseName: warehouseInfo?.name,
        storageDays: storageType !== 'None' ? storageDays : 0,
        storageType: storageType,
        requiresHandling: requiresHandling
      });

      setOrders(prev => [res.data, ...prev]);
      setSelectedOrder(res.data);
      setBookingStatus('success');
      
      setTimeout(() => {
        setBookingStatus('idle');
      }, 2500);
    } catch (err) {
      alert('Error requesting B2B freight quote.');
      setBookingStatus('idle');
    }
  };

  const handleCustomerDecision = async (orderId: string, decision: 'accept' | 'reject') => {
    setDecisionLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/orders/${orderId}/customer-decision`, {
        decision
      });
      setSelectedOrder(res.data.order);
      setOrders(prev => prev.map(o => o.orderId === orderId ? res.data.order : o));
      setShowBillModal(false);
    } catch (err) {
      alert('Failed to submit decision.');
    } finally {
      setDecisionLoading(false);
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
    <div className="flex-1 flex flex-col bg-zinc-950 min-h-screen text-zinc-100">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
            <Warehouse className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-white tracking-wide">Tamil Nadu B2B Freight & Warehousing</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">16 Hubs Active</span>
            </div>
            <span className="block text-xs text-zinc-400">Shipper Account: {customerName}</span>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="p-2.5 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
          title="Logout"
        >
          <LogOut className="w-4 h-4 text-rose-400" /> Exit
        </button>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Order Booking Form */}
        <section className="lg:col-span-5 bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-cyan-400" /> Book Heavy Freight & Storage
            </h2>
            <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">Commercial Fleet</span>
          </div>

          <form onSubmit={handleBookOrder} className="space-y-4">
            
            {/* Route Mode Switch */}
            <div className="flex items-center justify-between p-1 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setUseCustomWarehousePair(false)}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${!useCustomWarehousePair ? 'bg-cyan-500 text-zinc-950 font-bold' : 'text-zinc-400'}`}
              >
                Preset Industrial Routes
              </button>
              <button
                type="button"
                onClick={() => setUseCustomWarehousePair(true)}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${useCustomWarehousePair ? 'bg-cyan-500 text-zinc-950 font-bold' : 'text-zinc-400'}`}
              >
                Inter-Warehouse Terminal
              </button>
            </div>

            {!useCustomWarehousePair ? (
              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Select Tamil Nadu Freight Corridor</label>
                <select
                  value={selectedRouteIdx}
                  onChange={(e) => setSelectedRouteIdx(parseInt(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {TAMIL_NADU_PRESET_ROUTES.map((route, idx) => (
                    <option key={idx} value={idx}>{route.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Origin Port / Terminal</label>
                  <select
                    value={customPickupWh}
                    onChange={(e) => setCustomPickupWh(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {TAMIL_NADU_WAREHOUSES.map((wh) => (
                      <option key={wh.id} value={wh.id}>{wh.name} ({wh.type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Destination Hub</label>
                  <select
                    value={customDropWh}
                    onChange={(e) => setCustomDropWh(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {TAMIL_NADU_WAREHOUSES.map((wh) => (
                      <option key={wh.id} value={wh.id}>{wh.name} ({wh.type})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Cargo Specs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Cargo Weight (Metric Tonnes)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="45"
                  required
                  value={packageWeight}
                  onChange={(e) => setPackageWeight(parseFloat(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Cargo Commodity</label>
                <select
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Heavy Machinery & Parts">Heavy Machinery & Parts</option>
                  <option value="Automotive Components">Automotive Components</option>
                  <option value="Textiles & Garments">Textiles & Garments</option>
                  <option value="Electronics & IT Hardware">Electronics & IT Hardware</option>
                  <option value="Perishable Cold-Chain Goods">Perishable Cold-Chain Goods</option>
                  <option value="Port Container Cargo">Port Container Cargo</option>
                </select>
              </div>
            </div>

            {/* Warehouse Storage Options */}
            <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-2.5">
              <span className="block text-[11px] font-bold text-amber-400 flex items-center gap-1.5 uppercase">
                <Warehouse className="w-3.5 h-3.5 text-amber-400" /> Warehouse Storage & Staging Services
              </span>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-500 text-[9px] uppercase font-semibold mb-1">Storage Type</label>
                  <select
                    value={storageType}
                    onChange={(e) => setStorageType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white"
                  >
                    <option value="None">No Storage (Direct Transit)</option>
                    <option value="Ambient">Ambient Pallet Storage</option>
                    <option value="Cold Storage">Temperature-Controlled Cold Storage</option>
                    <option value="Pallet Staging">Pallet Staging & Consolidation</option>
                    <option value="Bonded Yard">Port Bonded Yard</option>
                    <option value="Cross-Docking">Fast Cross-Docking Hub</option>
                  </select>
                </div>
                {storageType !== 'None' && (
                  <div>
                    <label className="block text-zinc-500 text-[9px] uppercase font-semibold mb-1">Storage Duration</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={storageDays}
                      onChange={(e) => setStorageDays(parseInt(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="handlingCheck"
                  checked={requiresHandling}
                  onChange={(e) => setRequiresHandling(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="handlingCheck" className="text-xs text-zinc-300 select-none">
                  Include Mechanized Forklift & Loading/Unloading handling (₹1,250)
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={bookingStatus === 'loading'}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10"
            >
              {bookingStatus === 'loading' ? (
                'Transmitting to Dispatcher Tower...'
              ) : bookingStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-zinc-950" /> Freight Request Submitted!
                </>
              ) : (
                <>
                  Submit Request for Dispatcher Quotation <ArrowRight className="w-4 h-4 text-zinc-950" />
                </>
              )}
            </button>
          </form>

          {/* Quick Notice */}
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-[11px] text-indigo-300">
            <strong>B2B Quotation Workflow:</strong> Once submitted, the dispatcher calculates exact highway toll, weight surcharges, and warehouse facility fees, and presents an itemized bill for your approval.
          </div>
        </section>

        {/* Right Side: Interactive Map & Order Monitoring */}
        <section className="lg:col-span-7 flex flex-col space-y-6">
          
          {/* Active / Selected Order Card */}
          {selectedOrder && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
              
              {/* Status Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 font-mono">{selectedOrder.orderId}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                      selectedOrder.status === 'pending_quote' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      selectedOrder.status === 'quoted' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 animate-pulse' :
                      selectedOrder.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      selectedOrder.status === 'assigned' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                      selectedOrder.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {selectedOrder.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1">{selectedOrder.package?.type || 'Commercial Freight'} ({selectedOrder.package?.weight || 10} MT)</h3>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Estimated / Quoted Total</span>
                  <span className="text-lg font-extrabold text-cyan-400">₹{selectedOrder.price?.toLocaleString()}</span>
                </div>
              </div>

              {/* Quotation Action Banner */}
              {selectedOrder.status === 'quoted' && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/40 rounded-2xl mb-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-cyan-300 block">Official Dispatcher Bill Presented!</span>
                    <span className="text-[11px] text-zinc-400">Review line-item freight and warehouse storage breakdown.</span>
                  </div>
                  <button
                    onClick={() => setShowBillModal(true)}
                    className="px-3.5 py-1.5 bg-cyan-500 text-zinc-950 font-bold rounded-lg text-xs hover:bg-cyan-400 transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                  >
                    <FileText className="w-3.5 h-3.5" /> Review & Accept Bill
                  </button>
                </div>
              )}

              {/* Route Path Info */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80 mb-4">
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Pickup Origin
                  </span>
                  <p className="text-zinc-200 mt-1 font-medium truncate">{selectedOrder.pickup?.address}</p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Drop Terminal
                  </span>
                  <p className="text-zinc-200 mt-1 font-medium truncate">{selectedOrder.drop?.address}</p>
                </div>
              </div>

              {/* Heavy Truck Assigned Info */}
              {activeDriverObj && (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between text-xs mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-xl">
                      <Truck className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">{activeDriverObj.name}</span>
                      <span className="text-[11px] text-zinc-400">{activeDriverObj.vehicleType} • {activeDriverObj.vehicleId}</span>
                    </div>
                  </div>
                  <span className="text-emerald-400 font-semibold text-xs capitalize bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    ● {activeDriverObj.status}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Map Container */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-4 flex-1 h-[420px] shadow-2xl relative overflow-hidden">
            <TrackingMap 
              pickupLocation={selectedOrder?.pickup}
              dropLocation={selectedOrder?.drop}
              driverLocation={mapDriverLoc}
              routeCoordinates={selectedOrder?.routeCoordinates || []}
              otherDrivers={drivers}
              showWarehouses={true}
            />
          </div>
        </section>
      </main>

      {/* Itemized Quotation Bill Modal */}
      {showBillModal && selectedOrder && selectedOrder.billingDetails && (
        <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto relative z-[100000]">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">B2B Freight & Warehousing Bill</h3>
                <span className="text-xs text-zinc-400">Order Ref: {selectedOrder.orderId}</span>
              </div>
              <button 
                onClick={() => setShowBillModal(false)}
                className="p-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill Breakdown Table */}
            <div className="space-y-2 text-xs bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Highway Transit Freight Base</span>
                <span className="font-semibold text-white">₹{selectedOrder.billingDetails.freightBase?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Heavy Cargo Tonnage Surcharge ({selectedOrder.package?.weight} MT)</span>
                <span className="font-semibold text-white">₹{selectedOrder.billingDetails.weightSurcharge?.toLocaleString()}</span>
              </div>
              {selectedOrder.billingDetails.storageFee > 0 && (
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Warehouse Facility & Storage Fee ({selectedOrder.storageDays} days - {selectedOrder.storageType})</span>
                  <span className="font-semibold text-amber-400">₹{selectedOrder.billingDetails.storageFee?.toLocaleString()}</span>
                </div>
              )}
              {selectedOrder.billingDetails.handlingFee > 0 && (
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Mechanized Forklift & Staging Handling</span>
                  <span className="font-semibold text-white">₹{selectedOrder.billingDetails.handlingFee?.toLocaleString()}</span>
                </div>
              )}
              {selectedOrder.billingDetails.tollSurcharge > 0 && (
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">NHAI Toll & Express Corridor Cess</span>
                  <span className="font-semibold text-white">₹{selectedOrder.billingDetails.tollSurcharge?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">GST (18% Commercial Transport & Logistics)</span>
                <span className="font-semibold text-white">₹{selectedOrder.billingDetails.gstAmount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 text-sm font-extrabold text-cyan-400">
                <span>Total Payable Amount</span>
                <span>₹{selectedOrder.billingDetails.totalAmount?.toLocaleString()}</span>
              </div>
            </div>

            {selectedOrder.billingDetails.notes && (
              <p className="text-[11px] text-zinc-400 bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-800/60">
                <strong>Dispatcher Notes:</strong> {selectedOrder.billingDetails.notes}
              </p>
            )}

            {/* Decision Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleCustomerDecision(selectedOrder.orderId, 'reject')}
                disabled={decisionLoading}
                className="flex-1 py-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" /> Decline Quotation
              </button>
              <button
                onClick={() => handleCustomerDecision(selectedOrder.orderId, 'accept')}
                disabled={decisionLoading}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-zinc-950 font-extrabold rounded-xl text-xs hover:from-emerald-400 hover:to-cyan-400 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" /> Accept Bill & Book Truck
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
