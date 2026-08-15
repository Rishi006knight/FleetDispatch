'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Truck, UserCircle2, ArrowRight, Lock, KeyRound, Warehouse, Info, Building2 } from 'lucide-react';

const STATION_DRIVER_ROSTER: Record<string, {
  district: string;
  address: string;
  lat: number;
  lng: number;
  drivers: Array<{ name: string; truckType: string }>;
}> = {
  '01': {
    district: 'Chennai Port',
    address: 'Rajaji Salai, Chennai Port CFS',
    lat: 13.0844,
    lng: 80.2936,
    drivers: [
      { name: 'Murugan', truckType: '32ft Heavy Trailer' },
      { name: 'Kaliyaperumal', truckType: '40ft Container Freightliner' },
      { name: 'Soundararajan', truckType: '20ft Multi-Axle Truck' },
      { name: 'Thangaraj', truckType: '32ft Heavy Trailer' },
    ]
  },
  '02': {
    district: 'Ennore Port',
    address: 'Kamarajar Port Road, Ennore',
    lat: 13.2611,
    lng: 80.3314,
    drivers: [
      { name: 'Shanmugam', truckType: '40ft Container Freightliner' },
      { name: 'Sundaram', truckType: '32ft Heavy Trailer' },
      { name: 'Kathirvel', truckType: '40ft Container Freightliner' },
    ]
  },
  '04': {
    district: 'Koyambedu',
    address: 'Wholesale Market Road, Koyambedu',
    lat: 13.0692,
    lng: 80.1948,
    drivers: [
      { name: 'Ganesan', truckType: '20ft Multi-Axle Truck' },
      { name: 'Venkatesan', truckType: 'Refrigerated Reefer Truck' },
      { name: 'Alagappan', truckType: '14ft Eicher Container' },
    ]
  },
  '22': {
    district: 'Tambaram',
    address: 'GST Road, Tambaram, Chennai',
    lat: 12.9249,
    lng: 80.1000,
    drivers: [
      { name: 'Mani', truckType: '14ft Eicher Container' },
      { name: 'Dharmalingam', truckType: '20ft Multi-Axle Truck' },
      { name: 'Boopathi', truckType: '32ft Heavy Trailer' },
    ]
  },
  '38': {
    district: 'Coimbatore',
    address: 'Peelamedu Avinashi Road, Coimbatore',
    lat: 11.0168,
    lng: 76.9558,
    drivers: [
      { name: 'Senthil Kumar', truckType: 'Refrigerated Reefer Truck' },
      { name: 'Ranganathan', truckType: '20ft Multi-Axle Truck' },
      { name: 'Muthukumar', truckType: '32ft Heavy Trailer' },
      { name: 'Karuppusamy', truckType: 'Refrigerated Reefer Truck' },
    ]
  },
  '58': {
    district: 'Madurai',
    address: 'Kappalur Ring Road, Madurai',
    lat: 9.9252,
    lng: 78.1198,
    drivers: [
      { name: 'Arumugam', truckType: '20ft Multi-Axle Truck' },
      { name: 'Pandian', truckType: '32ft Heavy Trailer' },
      { name: 'Jeyachandran', truckType: 'Refrigerated Reefer Truck' },
    ]
  },
  '45': {
    district: 'Trichy',
    address: 'Central Corridor, Tiruchirappalli',
    lat: 10.7905,
    lng: 78.7047,
    drivers: [
      { name: 'Ramasamy', truckType: '32ft Heavy Trailer' },
      { name: 'Balakrishnan', truckType: '20ft Multi-Axle Truck' },
      { name: 'Anbazhagan', truckType: '40ft Container Freightliner' },
    ]
  },
  '27': {
    district: 'Salem',
    address: 'Steel Plant Road, Salem',
    lat: 11.6643,
    lng: 78.1460,
    drivers: [
      { name: 'Karthik Raja', truckType: '14ft Eicher Container' },
      { name: 'Selvaraj', truckType: '20ft Multi-Axle Truck' },
      { name: 'Gunasekaran', truckType: '32ft Heavy Trailer' },
    ]
  },
  '72': {
    district: 'Tirunelveli',
    address: 'Gangaikondan SIPCOT, Tirunelveli',
    lat: 8.7139,
    lng: 77.7567,
    drivers: [
      { name: 'Muthu', truckType: '20ft Multi-Axle Truck' },
      { name: 'Ayyappan', truckType: '32ft Heavy Trailer' },
      { name: 'Balamurugan', truckType: '14ft Eicher Container' },
    ]
  },
  '23': {
    district: 'Vellore',
    address: 'Ranipet SIPCOT, Vellore',
    lat: 12.9165,
    lng: 79.1325,
    drivers: [
      { name: 'Perumal', truckType: '32ft Heavy Trailer' },
      { name: 'Saravanan', truckType: '20ft Multi-Axle Truck' },
      { name: 'Rajendran', truckType: '14ft Eicher Container' },
    ]
  },
  '39': {
    district: 'Tiruppur',
    address: 'Netaji Apparel Park, Tiruppur',
    lat: 11.1085,
    lng: 77.3411,
    drivers: [
      { name: 'Sakthivel', truckType: '20ft Multi-Axle Truck' },
      { name: 'Chinnasamy', truckType: '14ft Eicher Container' },
      { name: 'Govindasamy', truckType: '32ft Heavy Trailer' },
    ]
  },
  '33': {
    district: 'Erode',
    address: 'Perundurai SIPCOT, Erode',
    lat: 11.3410,
    lng: 77.7172,
    drivers: [
      { name: 'Palanisamy', truckType: 'Refrigerated Reefer Truck' },
      { name: 'Narayanan', truckType: '20ft Multi-Axle Truck' },
      { name: 'Ravichandran', truckType: '14ft Eicher Container' },
    ]
  },
  '69': {
    district: 'Thoothukudi',
    address: 'Harbour Estate CFS, Thoothukudi',
    lat: 8.7642,
    lng: 78.1348,
    drivers: [
      { name: 'Velu Pandian', truckType: '40ft Container Freightliner' },
      { name: 'Subramanian', truckType: '32ft Heavy Trailer' },
      { name: 'Chelladurai', truckType: '20ft Multi-Axle Truck' },
    ]
  },
  '49': {
    district: 'Thanjavur',
    address: 'Pillaiyarpatti Delta Terminal, Thanjavur',
    lat: 10.7870,
    lng: 79.1378,
    drivers: [
      { name: 'Manickam', truckType: '14ft Eicher Container' },
      { name: 'Elangovan', truckType: '20ft Multi-Axle Truck' },
      { name: 'Selvam', truckType: 'Refrigerated Reefer Truck' },
    ]
  },
  '70': {
    district: 'Hosur',
    address: 'SIPCOT Phase-II, Hosur',
    lat: 12.7409,
    lng: 77.8253,
    drivers: [
      { name: 'Dhandapani', truckType: '32ft Heavy Trailer' },
      { name: 'Thirunavukkarasu', truckType: '20ft Multi-Axle Truck' },
      { name: 'Sivakumar', truckType: '32ft Heavy Trailer' },
    ]
  },
  '74': {
    district: 'Nagercoil',
    address: 'Kanyakumari Highway, Nagercoil',
    lat: 8.1833,
    lng: 77.4119,
    drivers: [
      { name: 'Vijayakumar', truckType: '20ft Multi-Axle Truck' },
      { name: 'Ponraj', truckType: '14ft Eicher Container' },
      { name: 'Kannan', truckType: 'Refrigerated Reefer Truck' },
    ]
  },
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
        localStorage.setItem('user_name', 'Quantum Express System Dispatcher');
        router.push('/admin');
      } else {
        setError('Invalid dispatcher credentials. Hint: admin / admin123');
      }
    } else if (role === 'driver') {
      const cleanUpperUser = cleanUser.toUpperCase();
      const rtoMatch = cleanUpperUser.match(/^TN-(\d{2})-(\d{4})$/);
      
      if (!rtoMatch) {
        setError('Username must follow Quantum Express Driver format: TN-XX-1001 (e.g. TN-01-1001, TN-38-1002 - where last 4 digits is unique driver ID)');
        return;
      }

      const rtoCode = rtoMatch[1];
      const driverUnit = rtoMatch[2]; // e.g. "1001", "1002"
      const expectedPassword = `drivertn${rtoCode}`.toLowerCase();

      if (cleanPass === expectedPassword || cleanPass === 'driver123') {
        const station = STATION_DRIVER_ROSTER[rtoCode];
        const unitNum = parseInt(driverUnit);
        const unitIdx = !isNaN(unitNum) ? unitNum - 1001 : 0;

        const driverMeta = (station && station.drivers && station.drivers[unitIdx])
          ? station.drivers[unitIdx]
          : { name: `Driver #${driverUnit}`, truckType: '20ft Multi-Axle Truck' };

        const stationAddress = station ? station.address : 'State Logistics Center';
        const stationLat = station ? station.lat : 13.0692;
        const stationLng = station ? station.lng : 80.1948;

        // Exact Format: Name(address-username)
        const driverName = `${driverMeta.name} (${stationAddress} - ${cleanUpperUser})`;
        const vehicleId = `TN-${rtoCode}-TR-${driverUnit}`;
        const driverId = `TRK-${rtoCode}-${driverUnit}`;

        localStorage.setItem('user_role', 'driver');
        localStorage.setItem('driver_id', driverId);
        localStorage.setItem('driver_unit', driverUnit);
        localStorage.setItem('user_name', driverName);
        localStorage.setItem('vehicle_id', vehicleId);
        localStorage.setItem('rto_code', rtoCode);
        localStorage.setItem('driver_hub', stationAddress);
        localStorage.setItem('driver_lat', String(stationLat));
        localStorage.setItem('driver_lng', String(stationLng));
        localStorage.setItem('vehicle_type', driverMeta.truckType);

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

  const handleQuickSelectRTO = (rto: string, unit: string = '1001') => {
    setUsername(`TN-${rto}-${unit}`);
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
                        onClick={() => handleQuickSelectRTO(item.rto, '1001')}
                        className={`p-1.5 rounded-lg border text-center font-mono font-bold transition-all ${
                          username.startsWith(`TN-${item.rto}`)
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-400 text-xs font-semibold">
                      Truck Driver Username <span className="text-zinc-500 font-mono text-[10px]">(Pattern: TN-XX-1001)</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-500">Unit:</span>
                      {['1001', '1002', '1003'].map(unit => {
                        const currentRto = username.split('-')[1] || '01';
                        return (
                          <button
                            key={unit}
                            type="button"
                            onClick={() => handleQuickSelectRTO(currentRto, unit)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-all ${
                              username.endsWith(unit)
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                            }`}
                          >
                            #{unit}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="TN-01-1001"
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
                    <Lock className="w-3.5 h-3.5 text-zinc-600" /> Pattern: <code className="text-zinc-400">username: TN-XX-1001</code>
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
