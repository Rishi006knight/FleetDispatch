'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, Power, ShieldAlert, CheckCircle2, 
  MapPin, DollarSign, Upload, AlertCircle, 
  ChevronRight, Play, Square, Award 
} from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function DriverPortal() {
  const router = useRouter();
  const [driver, setDriver] = useState<any | null>(null);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [matchRequest, setMatchRequest] = useState<any | null>(null);

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
    const driverId = localStorage.getItem('driver_id') || 'DRV-101';
    
    if (role !== 'driver') {
      router.push('/');
      return;
    }

    // Connect socket
    socketRef.current = io(API_URL);
    
    socketRef.current.on('connect', () => {
      console.log('Driver socket connected');
      socketRef.current.emit('join_room', driverId);
    });

    // Listen for dispatch assignment
    socketRef.current.on('ORDER_ASSIGNED', ({ order, driver: updatedDriver }: any) => {
      if (updatedDriver.driverId === driverId) {
        setDriver(updatedDriver);
        setActiveOrder(order);
        setMatchRequest(null);
      }
    });

    // Listen for matching requests
    socketRef.current.on('ORDER_MATCH_ALERT', (data: any) => {
      // In a real flow, matching alerts can be pushed. We'll poll or pull them when online.
    });

    // Pull driver profile on load
    fetchDriverProfile(driverId);

    return () => {
      if (driveTimerRef.current) clearInterval(driveTimerRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const fetchDriverProfile = async (id: string) => {
    try {
      const res = await axios.get(`${API_URL}/api/drivers`);
      const matched = res.data.find((d: any) => d.driverId === id);
      
      if (matched) {
        setDriver(matched);
        // Find if driver has any busy orders in DB
        const ordersRes = await axios.get(`${API_URL}/api/orders`);
        const active = ordersRes.data.find((o: any) => o.driverId === id && !['completed', 'failed'].includes(o.status));
        if (active) {
          setActiveOrder(active);
        }
      } else {
        // If driver doesn't exist, register them
        const regRes = await axios.post(`${API_URL}/api/drivers`, {
          name: 'Express Driver #D101',
          phone: '9876543210',
          vehicleId: 'MH-12-EX-4921',
          vehicleType: 'bike',
          initialLat: 19.076,
          initialLng: 72.877
        });
        setDriver(regRes.data);
      }
    } catch (err) {
      console.warn('Failed to load driver profile. Initializing offline mock.');
      setDriver({
        driverId: 'DRV-101',
        name: 'Express Driver #D101',
        vehicleType: 'bike',
        status: 'offline',
        currentLocation: { lat: 19.0760, lng: 72.8777 },
        rating: 4.85,
        reliability: 0.96,
        earnings: 1250,
        completedDeliveries: 12,
        cancellationRate: 0.02
      });
    }
  };

  // Check for matched pending orders for this driver
  useEffect(() => {
    if (!driver || driver.status !== 'online' || activeOrder) return;
    
    // Check if there are pending orders that we can pull as simulated match
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/orders`);
        const pending = res.data.filter((o: any) => o.status === 'pending');
        if (pending.length > 0 && !matchRequest) {
          // Mock order match alert for simulation
          setMatchRequest(pending[0]);
        }
      } catch (err) {}
    }, 4000);

    return () => clearInterval(interval);
  }, [driver, activeOrder, matchRequest]);

  const handleToggleOnline = async () => {
    if (!driver) return;
    const targetStatus = driver.status === 'offline' ? 'online' : 'offline';
    
    try {
      const res = await axios.put(`${API_URL}/api/drivers/${driver.driverId}/status`, { status: targetStatus });
      setDriver(res.data);
      if (targetStatus === 'offline') {
        setMatchRequest(null);
      }
    } catch (err) {
      setDriver((prev: any) => ({ ...prev, status: targetStatus }));
    }
  };

  const handleAcceptOrder = async () => {
    if (!matchRequest || !driver) return;
    try {
      const res = await axios.post(`${API_URL}/api/orders/assign`, {
        orderId: matchRequest.orderId,
        driverId: driver.driverId
      });
      setActiveOrder(res.data);
      setMatchRequest(null);
      fetchDriverProfile(driver.driverId);
    } catch (err) {
      alert('Failed to accept order.');
    }
  };

  const handleDeclineOrder = () => {
    setMatchRequest(null);
  };

  const updateOrderStatus = async (nextStatus: string) => {
    if (!activeOrder) return;
    try {
      const res = await axios.put(`${API_URL}/api/orders/${activeOrder.orderId}/status`, { status: nextStatus });
      setActiveOrder(res.data);
    } catch (err) {
      setActiveOrder((prev: any) => ({ ...prev, status: nextStatus }));
    }
  };

  // Simulated delivery driving interval
  const startDriveSimulation = () => {
    if (!activeOrder || isDriving) return;
    setIsDriving(true);
    setDriveIndex(0);
    setPodStatus('idle');
    setErrorMessage('');

    const route = activeOrder.routeCoordinates || [];
    if (route.length === 0) return;

    driveTimerRef.current = setInterval(async () => {
      setDriveIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= route.length) {
          clearInterval(driveTimerRef.current);
          setIsDriving(false);
          // Auto transition to completed status or prompt for POD
          return prevIndex;
        }

        const point = route[nextIndex];
        
        // Post GPS update to backend
        axios.post(`${API_URL}/api/drivers/${driver.driverId}/telemetry`, {
          lat: point.lat,
          lng: point.lng,
          speed: Math.round(25 + Math.random() * 15),
          heading: Math.round(Math.random() * 360),
          activeOrderId: activeOrder.orderId
        }).catch(() => {});

        return nextIndex;
      });
    }, 1000);
  };

  const stopDriveSimulation = () => {
    if (driveTimerRef.current) clearInterval(driveTimerRef.current);
    setIsDriving(false);
  };

  // Convert custom base64 files for testing
  const selectMockPODFile = (type: 'valid' | 'fraud') => {
    // We generate dummy solid base64 images that are either:
    // valid: a picture with high frequency contours/edges (we can mock this by using a high-density base64 encoded photo)
    // fraud: a solid black image (too dark) or solid gray (no textures/edges)
    
    if (type === 'valid') {
      // Base64 encoding of a small detailed checkerboard or package photo
      setPodPhoto('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAASABIBEA0kAQAAAQ/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=');
    } else {
      // Solid black screen base64 (failing CV checks)
      setPodPhoto('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
    }
    setPodStatus('idle');
  };

  const submitProofOfDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podPhoto || !activeOrder || !driver) return;

    setPodStatus('loading');
    setErrorMessage('');

    try {
      const res = await axios.post(`${API_URL}/api/orders/${activeOrder.orderId}/verify-pod`, {
        photoBase64: podPhoto,
        driverLocation: driver.currentLocation
      });

      if (res.data.success) {
        setPodStatus('success');
        setTimeout(() => {
          setActiveOrder(null);
          setPodPhoto('');
          setPodStatus('idle');
          fetchDriverProfile(driver.driverId);
        }, 2000);
      } else {
        setPodStatus('failed');
        setErrorMessage(res.data.message);
      }
    } catch (err: any) {
      setPodStatus('failed');
      setErrorMessage(err.response?.data?.error || 'Verification server timeout.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  if (!driver) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Loading profile...</div>;

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 min-h-screen">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
            <Truck className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Driver Portal</h1>
            <span className="block text-[10px] text-zinc-500">ID: {driver.driverId}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Online/Offline status switch */}
          <button
            onClick={handleToggleOnline}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              driver.status === 'offline'
                ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {driver.status === 'offline' ? 'Offline' : 'Online'}
          </button>
          
          <button 
            onClick={handleLogout}
            className="p-2 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"
            title="Logout"
          >
            <Power className="w-3.5 h-3.5 text-rose-500" />
          </button>
        </div>
      </header>

      {/* Main content body */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4">
        {/* Earnings Card */}
        <section className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-3xl grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Earnings</span>
            <span className="text-base font-bold text-white flex items-center justify-center">
              ₹{driver.earnings}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Deliveries</span>
            <span className="text-base font-bold text-cyan-400">{driver.completedDeliveries}</span>
          </div>
          <div>
            <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Rating</span>
            <span className="text-base font-bold text-amber-400">★{driver.rating.toFixed(2)}</span>
          </div>
        </section>

        {/* Offline View */}
        {driver.status === 'offline' && (
          <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-3xl p-8 text-center text-zinc-500 py-12">
            <Power className="w-12 h-12 mx-auto text-zinc-700 mb-3 animate-pulse" />
            <p className="text-sm font-semibold">You are currently offline</p>
            <p className="text-xs text-zinc-600 mt-1">Tap the status switch above to go online and receive matches.</p>
          </div>
        )}

        {/* Online, Waiting for order matches */}
        {driver.status === 'online' && !activeOrder && !matchRequest && (
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8 text-center py-16 flex flex-col items-center">
            {/* Radar scanner animation */}
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border border-cyan-500/25 animate-ping" style={{ animationDuration: '3s' }}></div>
              <div className="absolute inset-4 rounded-full border border-cyan-500/40 animate-ping" style={{ animationDuration: '2s' }}></div>
              <div className="absolute inset-8 rounded-full bg-cyan-500/10 border border-cyan-400 flex items-center justify-center">
                <Truck className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <p className="text-sm font-bold text-white">Radar Active</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">Waiting for matching orders in your delivery zone...</p>
          </div>
        )}

        {/* Matching Offer Popup */}
        {driver.status === 'online' && matchRequest && !activeOrder && (
          <div className="bg-zinc-900 border-2 border-cyan-500 p-5 rounded-3xl shadow-xl shadow-cyan-500/5 space-y-4 animate-bounce" style={{ animationIterationCount: 1 }}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Order Offer Detected
              </span>
              <span className="text-[10px] text-zinc-500">Expires in 30s</span>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-zinc-500 font-semibold uppercase text-[9px]">Pickup</span>
                  <span className="text-zinc-200">{matchRequest.pickup.address}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-zinc-500 font-semibold uppercase text-[9px]">Dropoff</span>
                  <span className="text-zinc-200">{matchRequest.drop.address}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
              <div>
                <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Pay</span>
                <span className="text-sm font-bold text-white">₹{matchRequest.price}</span>
              </div>
              <div>
                <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Risk</span>
                <span className="text-sm font-bold text-amber-500">Low</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleDeclineOrder}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold py-2.5 rounded-xl text-xs border border-zinc-700 transition-all"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptOrder}
                className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/10"
              >
                Accept Order
              </button>
            </div>
          </div>
        )}

        {/* Active Order Board */}
        {activeOrder && (
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <span className="block text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">Active Delivery</span>
                <span className="text-xs font-bold text-white">{activeOrder.orderId}</span>
              </div>
              <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-xl">
                ₹{activeOrder.price}
              </span>
            </div>

            {/* Stepper Status controls */}
            {activeOrder.status === 'assigned' && (
              <button
                onClick={() => updateOrderStatus('picked_up')}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
              >
                Start Pickup Drive
              </button>
            )}

            {activeOrder.status === 'picked_up' && (
              <button
                onClick={() => updateOrderStatus('out_for_delivery')}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
              >
                Package Collected & Start Delivery
              </button>
            )}

            {activeOrder.status === 'out_for_delivery' && (
              <div className="space-y-4">
                {/* Simulated GPS runner */}
                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[9px]">Real-Time GPS Simulation</span>
                    <span className={`text-[10px] font-bold ${isDriving ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {isDriving ? '• SIMULATOR ACTIVE' : '• STANDBY'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {!isDriving ? (
                      <button
                        onClick={startDriveSimulation}
                        className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 text-zinc-950 fill-zinc-950" /> Start GPS Drive
                      </button>
                    ) : (
                      <button
                        onClick={stopDriveSimulation}
                        className="bg-zinc-800 hover:bg-zinc-700 text-rose-500 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 border border-zinc-700 transition-all"
                      >
                        <Square className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> Stop Drive
                      </button>
                    )}
                    <span className="text-zinc-500 text-xs">
                      Step: {driveIndex} / {activeOrder.routeCoordinates?.length || 0}
                    </span>
                  </div>
                </div>

                {/* Proof of Delivery Photo Uploader */}
                <form onSubmit={submitProofOfDelivery} className="space-y-3">
                  <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Proof of Delivery (POD)</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => selectMockPODFile('valid')}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        podPhoto && podPhoto.startsWith('/9j/') 
                          ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' 
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      Use Valid Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => selectMockPODFile('fraud')}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        podPhoto && podPhoto.startsWith('iVBOR') 
                          ? 'bg-rose-500/10 border-rose-500 text-rose-400' 
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      Use Blank Photo (Fraud)
                    </button>
                  </div>

                  {podPhoto && (
                    <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-[10px] text-zinc-500 truncate">
                      File Selected: {podPhoto.slice(0, 30)}...
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!podPhoto || podStatus === 'loading'}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-zinc-950 font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    {podStatus === 'loading' ? 'Verifying Upload...' : 'Submit Proof of Delivery'}
                  </button>

                  {podStatus === 'success' && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" /> POD Verification Passed! Order completed.
                    </div>
                  )}

                  {podStatus === 'failed' && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> 
                      <div>
                        <span className="font-bold">POD Rejected:</span> {errorMessage}
                      </div>
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
