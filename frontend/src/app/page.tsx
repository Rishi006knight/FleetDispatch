'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Truck, UserCircle2, ArrowRight, Lock, KeyRound, Warehouse, Info, Building2 } from 'lucide-react';

const RTO_DISTRICT_MAP: Record<string, { district: string; hub: string; lat: number; lng: number; vehicleType: string }> = {
  '01': { district: 'Chennai Central', hub: 'Chennai Port Container Terminal', lat: 13.0844, lng: 80.2936, vehicleType: '32ft Heavy Trailer' },
  '02': { district: 'Chennai North', hub: 'Ennore Port (Kamarajar) Terminal', lat: 13.2611, lng: 80.3314, vehicleType: '40ft Container Freightliner' },
  '04': { district: 'Chennai East', hub: 'Koyambedu Wholesale Terminal', lat: 13.0692, lng: 80.1948, vehicleType: '20ft Multi-Axle Truck' },
  '22': { district: 'Meenambakkam', hub: 'Tambaram South Gateway Hub', lat: 12.9249, lng: 80.1000, vehicleType: '14ft Eicher Container' },
  '38': { district: 'Coimbatore North', hub: 'Peelamedu Industrial Hub', lat: 11.0168, lng: 76.9558, vehicleType: 'Refrigerated Reefer Truck' },
  '58': { district: 'Madurai South', hub: 'Kappalur Ring Road Hub', lat: 9.9252, lng: 78.1198, vehicleType: '20ft Multi-Axle Truck' },
  '45': { district: 'Tiruchirappalli', hub: 'Trichy Central Transit Hub', lat: 10.7905, lng: 78.7047, vehicleType: '32ft Heavy Trailer' },
  '27': { district: 'Salem', hub: 'Steel Plant Road Logistics Center', lat: 11.6643, lng: 78.1460, vehicleType: '14ft Eicher Container' },
  '72': { district: 'Tirunelveli', hub: 'Gangaikondan SIPCOT Hub', lat: 8.7139, lng: 77.7567, vehicleType: '20ft Multi-Axle Truck' },
  '23': { district: 'Vellore', hub: 'Ranipet-Vellore Industrial Park', lat: 12.9165, lng: 79.1325, vehicleType: '32ft Heavy Trailer' },
  '39': { district: 'Tiruppur', hub: 'Netaji Apparel Park Hub', lat: 11.1085, lng: 77.3411, vehicleType: '20ft Multi-Axle Truck' },
  '33': { district: 'Erode', hub: 'Perundurai SIPCOT Complex', lat: 11.3410, lng: 77.7172, vehicleType: 'Refrigerated Reefer Truck' },
  '69': { district: 'Thoothukudi', hub: 'V.O.C Port CFS Terminal', lat: 8.7642, lng: 78.1348, vehicleType: '40ft Container Freightliner' },
  '49': { district: 'Thanjavur', hub: 'Pillaiyarpatti Delta Terminal', lat: 10.7870, lng: 79.1378, vehicleType: '14ft Eicher Container' },
  '70': { district: 'Hosur', hub: 'SIPCOT Auto & Electronics Hub', lat: 12.7409, lng: 77.8253, vehicleType: '32ft Heavy Trailer' },
  '74': { district: 'Nagercoil', hub: 'Kanyakumari Gateway Depot', lat: 8.1833, lng: 77.4119, vehicleType: '20ft Multi-Axle Truck' },
};

const SAMPLE_B2B_BUSINESSES = [
  { code: 'ABC123', name: 'ABC Global Logistics & Freight Ltd' },
  { code: 'KVI101', name: 'Kovai Industrial Components Ltd' },
  { code: 'CHE001', name: 'Chennai Port Container Exporters' },
  { code: 'MDU909', name: 'Madurai Spun Silk & Textiles' },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'admin' | 'driver' | 'customer'>('customer');
  const [username, setUsername] = useState('ABC Global Logistics & Freight Ltd');
  const [password, setPassword] = useState('');
  const [businessCode, setBusinessCode] = useState('ABC123');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim();
    const cleanPass = password.trim().toLowerCase();

    if (role === 'admin') {
      if (cleanUser.toUpperCase() === 'ADMIN' && cleanPass === 'admin123') {
        localStorage.setItem('user_role', 'admin');
        localStorage.setItem('user_name', 'Tamil Nadu System Dispatcher');
        router.push('/admin');
      } else {
        setError('Invalid dispatcher credentials. Hint: admin / admin123');
      }
    } else if (role === 'driver') {
      const cleanUpperUser = cleanUser.toUpperCase();
      const rtoMatch = cleanUpperUser.match(/^TN-(\d{2})(-\w+)?$/);
      
      if (!rtoMatch) {
        setError('Username must follow Tamil Nadu RTO format: TN-XX-0001 (e.g. TN-01-0001, TN-38-0001)');
        return;
      }

      const rtoCode = rtoMatch[1];
      const expectedPassword = `drivertn${rtoCode}`.toLowerCase();

      if (cleanPass === expectedPassword || cleanPass === 'driver123') {
        const info = RTO_DISTRICT_MAP[rtoCode] || {
          district: `District ${rtoCode}`,
          hub: 'Tamil Nadu Regional Terminal',
          lat: 13.0692,
          lng: 80.1948,
          vehicleType: '20ft Multi-Axle Truck'
        };

        const vehicleId = `TN-${rtoCode}-TR-${rtoMatch[2] ? rtoMatch[2].replace('-', '') : '0001'}`;
        const driverId = `TRK-${rtoCode}-01`;
        const driverName = `Driver (${info.district} - ${cleanUpperUser})`;

        localStorage.setItem('user_role', 'driver');
        localStorage.setItem('driver_id', driverId);
        localStorage.setItem('user_name', driverName);
        localStorage.setItem('vehicle_id', vehicleId);
        localStorage.setItem('rto_code', rtoCode);
        localStorage.setItem('driver_hub', info.hub);
        localStorage.setItem('driver_lat', String(info.lat));
        localStorage.setItem('driver_lng', String(info.lng));
        localStorage.setItem('vehicle_type', info.vehicleType);

        router.push('/driver');
      } else {
        setError(`Invalid driver credentials for ${cleanUpperUser}. Password must be "drivertn${rtoCode}"`);
      }
    } else {
      // B2B Shipper login with unique Business Code (e.g. ABC123)
      const cleanCode = businessCode.trim().toUpperCase();
      
      // Validate business code format: 3 letters + 3 numbers (e.g. ABC123) or at least 4 alphanumeric chars
      if (!cleanCode || cleanCode.length < 4) {
        setError('Please enter a valid unique Business Code (e.g. ABC123 - 3 Letters followed by 3 Numbers).');
        return;
      }

      if (!cleanUser) {
        setError('Please enter your Company / Shipper Business Name.');
        return;
      }

      localStorage.setItem('user_role', 'customer');
      localStorage.setItem('user_name', cleanUser);
      localStorage.setItem('business_code', cleanCode);
      router.push('/customer');
    }
  };

  const handleQuickSelectRTO = (rto: string) => {
    setUsername(`TN-${rto}-0001`);
    setPassword(`drivertn${rto}`);
    setError('');
  };

  const handleQuickSelectBusiness = (b: { code: string; name: string }) => {
    setBusinessCode(b.code);
    setUsername(b.name);
    setError('');
  };

  return (
    <div className="flex-1 min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 rounded-2xl mb-3 shadow-lg shadow-cyan-500/10">
            <Truck className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            QUANTUM<span className="text-cyan-400">EXPRESS</span>
          </h1>
          <p className="mt-1 text-zinc-400 text-xs tracking-wide">
            Enterprise B2B Freight Orchestration & State Logistics Center Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-7 backdrop-blur-md shadow-2xl space-y-5">
          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-zinc-950 border border-zinc-800 rounded-xl">
            <button
              onClick={() => { setRole('customer'); setError(''); setUsername('ABC Global Logistics & Freight Ltd'); setBusinessCode('ABC123'); }}
              className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-xs font-bold transition-all ${
                role === 'customer'
                  ? 'bg-cyan-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Building2 className="w-4 h-4 mb-1" />
              B2B Shipper
            </button>
            <button
              onClick={() => { setRole('driver'); setError(''); setUsername('TN-01-0001'); setPassword('drivertn01'); }}
              className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-xs font-bold transition-all ${
                role === 'driver'
                  ? 'bg-cyan-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Truck className="w-4 h-4 mb-1" />
              Heavy Truck Driver
            </button>
            <button
              onClick={() => { setRole('admin'); setError(''); setUsername('admin'); setPassword('admin123'); }}
              className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-xs font-bold transition-all ${
                role === 'admin'
                  ? 'bg-cyan-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 mb-1" />
              Dispatcher Tower
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* B2B Shipper Column */}
            {role === 'customer' && (
              <div className="space-y-4">
                
                {/* Business Code Quick Select Chips */}
                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <KeyRound className="w-3.5 h-3.5" /> Sample Business Accounts:
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {SAMPLE_B2B_BUSINESSES.map(b => (
                      <button
                        key={b.code}
                        type="button"
                        onClick={() => handleQuickSelectBusiness(b)}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          businessCode === b.code
                            ? 'bg-cyan-500 text-zinc-950 border-cyan-400 font-bold shadow-sm'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                        }`}
                      >
                        <span className="block font-mono font-extrabold text-xs">{b.code}</span>
                        <span className="block text-[10px] truncate">{b.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-1">
                    Company / Shipper Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC Global Logistics & Freight Ltd"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-1 flex items-center justify-between">
                    <span>Unique Business Code / Password</span>
                    <span className="text-zinc-500 font-mono text-[10px] uppercase">(Pattern: ABC123)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ABC123"
                    value={businessCode}
                    onChange={(e) => setBusinessCode(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono font-bold tracking-wider focus:outline-none focus:border-cyan-500 text-cyan-400 uppercase"
                  />
                </div>

                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-[11px] text-zinc-400 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Your quotations and billing records are isolated by this unique Business Code (e.g. <strong>{businessCode || 'ABC123'}</strong>).</span>
                </div>
              </div>
            )}

            {/* Heavy Truck Driver Column */}
            {role === 'driver' && (
              <div className="space-y-4">
                
                {/* RTO Quick Selection Chips */}
                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <KeyRound className="w-3.5 h-3.5" /> Select District / RTO Quick Login:
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-[11px]">
                    {[
                      { rto: '01', name: 'Chennai Port' },
                      { rto: '02', name: 'Ennore Port' },
                      { rto: '04', name: 'Koyambedu' },
                      { rto: '22', name: 'Tambaram' },
                      { rto: '38', name: 'Coimbatore' },
                      { rto: '58', name: 'Madurai' },
                      { rto: '45', name: 'Trichy' },
                      { rto: '27', name: 'Salem' },
                      { rto: '72', name: 'Tirunelveli' },
                      { rto: '23', name: 'Vellore' },
                      { rto: '39', name: 'Tiruppur' },
                      { rto: '33', name: 'Erode' },
                      { rto: '69', name: 'Thoothukudi' },
                      { rto: '49', name: 'Thanjavur' },
                      { rto: '70', name: 'Hosur' },
                      { rto: '74', name: 'Nagercoil' },
                    ].map(item => (
                      <button
                        key={item.rto}
                        type="button"
                        onClick={() => handleQuickSelectRTO(item.rto)}
                        className={`p-1.5 rounded-lg border text-center font-mono font-bold transition-all ${
                          username === `TN-${item.rto}-0001`
                            ? 'bg-cyan-500 text-zinc-950 border-cyan-400 shadow-sm'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                        }`}
                        title={item.name}
                      >
                        <span className="block text-[10px] uppercase">{item.rto}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-1">
                    Truck Driver Username <span className="text-zinc-500 font-mono text-[11px]">(Format: TN-XX-0001)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="TN-01-0001"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-1">
                    Password <span className="text-zinc-500 font-mono text-[11px]">(Format: drivertnXX)</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="drivertn01"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500 text-white"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-zinc-600" /> Pattern: <code className="text-zinc-400">username: TN-XX-0001</code>
                  </span>
                  <span>Password: <code className="text-cyan-400">drivertnXX</code></span>
                </div>
              </div>
            )}

            {/* Dispatcher Column */}
            {role === 'admin' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-1">Dispatcher Username</label>
                  <input
                    type="text"
                    required
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="admin123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 text-white"
                  />
                </div>
                <div className="text-[11px] text-zinc-500">
                  Default Dispatcher Credentials: <code className="text-cyan-400">admin / admin123</code>
                </div>
              </div>
            )}

            {error && (
              <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-black py-3 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 group"
            >
              Sign In to Command Portal
              <ArrowRight className="w-4 h-4 text-zinc-950 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-zinc-600 text-[11px]">
          Quantum Express Business Logistics Platform &copy; 2026. 16 State Logistics & Warehousing Hubs.
        </div>
      </div>
    </div>
  );
}
