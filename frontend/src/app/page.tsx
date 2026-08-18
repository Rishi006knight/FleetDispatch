'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, Truck, Radio, ArrowRight, ArrowLeft, 
  Eye, EyeOff, Lock, User, KeyRound
} from 'lucide-react';

const RTO_DISTRICTS = [
  { rto: '01', name: 'Chennai Port', lat: 13.0844, lng: 80.2936 },
  { rto: '02', name: 'Ennore Port', lat: 13.2611, lng: 80.3314 },
  { rto: '04', name: 'Koyambedu', lat: 13.0692, lng: 80.1948 },
  { rto: '22', name: 'Tambaram', lat: 12.9249, lng: 80.1000 },
  { rto: '38', name: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
  { rto: '58', name: 'Madurai', lat: 9.9252, lng: 78.1198 },
  { rto: '45', name: 'Trichy', lat: 10.7905, lng: 78.7047 },
  { rto: '27', name: 'Salem', lat: 11.6643, lng: 78.1460 },
  { rto: '72', name: 'Tirunelveli', lat: 8.7139, lng: 77.7567 },
  { rto: '23', name: 'Vellore', lat: 12.9165, lng: 79.1325 },
  { rto: '39', name: 'Tiruppur', lat: 11.1085, lng: 77.3411 },
  { rto: '33', name: 'Erode', lat: 11.3410, lng: 77.7172 },
  { rto: '69', name: 'Thoothukudi', lat: 8.7642, lng: 78.1348 },
  { rto: '49', name: 'Thanjavur', lat: 10.7870, lng: 79.1378 },
  { rto: '70', name: 'Hosur', lat: 12.7409, lng: 77.8253 },
  { rto: '74', name: 'Nagercoil', lat: 8.1833, lng: 77.4119 },
];

export default function LandingLoginPage() {
  const router = useRouter();
  
  // Selected portal state ('shipper' | 'driver' | 'dispatcher' | null)
  const [selectedPortal, setSelectedPortal] = useState<'shipper' | 'driver' | 'dispatcher' | null>(null);

  // Form inputs (No default sensitive or pre-filled credentials)
  const [shipperName, setShipperName] = useState('');
  const [businessCode, setBusinessCode] = useState('');
  const [shipperPassword, setShipperPassword] = useState('');
  const [showShipperPassword, setShowShipperPassword] = useState(false);

  const [selectedRTO, setSelectedRTO] = useState('01');
  const [driverUsername, setDriverUsername] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  const [showDriverPassword, setShowDriverPassword] = useState(false);

  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectRTO = (rto: string) => {
    setSelectedRTO(rto);
    setError('');
    if (driverUsername && driverUsername.includes('-')) {
      const parts = driverUsername.split('-');
      if (parts.length === 3) {
        setDriverUsername(`TN-${rto}-${parts[2]}`);
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      if (selectedPortal === 'dispatcher') {
        const cleanUser = adminUsername.trim().toUpperCase();
        const cleanPass = adminPassword.trim();
        if (!cleanUser || !cleanPass) {
          setIsSubmitting(false);
          setError('Please enter both administrator username and password.');
          return;
        }
        if (cleanUser === 'ADMIN' && (cleanPass === 'admin123' || cleanPass === 'admin' || cleanPass.length >= 6)) {
          localStorage.setItem('user_role', 'admin');
          localStorage.setItem('user_name', 'Quantum Express Control Tower Dispatcher');
          router.push('/admin');
        } else {
          setIsSubmitting(false);
          setError('Invalid dispatcher credentials. Please check your username and password.');
        }
      } else if (selectedPortal === 'driver') {
        const cleanUpperUser = driverUsername.trim().toUpperCase();
        const cleanPass = driverPassword.trim();

        if (!cleanUpperUser) {
          setIsSubmitting(false);
          setError('Please enter your Driver Username / Vehicle Badge (e.g. TN-01-1001)');
          return;
        }

        if (!cleanPass || cleanPass.length < 4) {
          setIsSubmitting(false);
          setError('Password / Security PIN must be at least 4 characters');
          return;
        }

        const rtoMatch = cleanUpperUser.match(/^TN-(\d{2})-(\d{4})$/i);
        
        let rtoCode = selectedRTO || '01';
        let driverUnit = '1001';

        if (rtoMatch) {
          rtoCode = rtoMatch[1];
          driverUnit = rtoMatch[2];
        } else {
          // Flexible fallback if driver types non-standard username
          const digits = cleanUpperUser.replace(/\D/g, '');
          if (digits.length >= 6) {
            rtoCode = digits.substring(0, 2);
            driverUnit = digits.substring(2, 6);
          } else if (digits.length >= 4) {
            driverUnit = digits.substring(0, 4);
          }
        }

        const matchedDistrict = RTO_DISTRICTS.find(d => d.rto === rtoCode) || RTO_DISTRICTS[0];
        const driverName = `Driver #${driverUnit} (${matchedDistrict.name} Hub - TN-${rtoCode}-${driverUnit})`;
        const vehicleId = `TN-${rtoCode}-TR-${driverUnit}`;
        const driverId = `TRK-${rtoCode}-${driverUnit}`;

        localStorage.setItem('user_role', 'driver');
        localStorage.setItem('driver_id', driverId);
        localStorage.setItem('driver_unit', driverUnit);
        localStorage.setItem('user_name', driverName);
        localStorage.setItem('vehicle_id', vehicleId);
        localStorage.setItem('rto_code', rtoCode);
        localStorage.setItem('driver_hub', `${matchedDistrict.name} Logistics Center`);
        localStorage.setItem('driver_lat', String(matchedDistrict.lat));
        localStorage.setItem('driver_lng', String(matchedDistrict.lng));
        localStorage.setItem('vehicle_type', '32ft Heavy Trailer');

        router.push('/driver');
      } else {
        // Shipper Portal
        const cleanCode = businessCode.trim().toUpperCase();
        const cleanName = shipperName.trim();
        const cleanPass = shipperPassword.trim();

        if (!cleanName || cleanName.length < 3) {
          setIsSubmitting(false);
          setError('Please enter your Company / Shipper Business Name');
          return;
        }

        if (!cleanCode || cleanCode.length < 4) {
          setIsSubmitting(false);
          setError('Business Code must be at least 4 alphanumeric characters (e.g. KVI101)');
          return;
        }

        if (!cleanPass || cleanPass.length < 4) {
          setIsSubmitting(false);
          setError('Account Password must be at least 4 characters');
          return;
        }

        localStorage.setItem('user_role', 'customer');
        localStorage.setItem('user_name', cleanName);
        localStorage.setItem('business_code', cleanCode);
        router.push('/customer');
      }
    }, 300);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0c1220] text-white flex flex-col justify-between overflow-x-hidden select-none">
      
      {/* ==================================================================== */}
      {/* BACKGROUND: High-Resolution Tamil Nadu Logistics Map & Ambient Layer */}
      {/* ==================================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div 
          className="absolute inset-0 bg-center bg-cover bg-no-repeat opacity-85 scale-100 transition-transform duration-1000"
          style={{ backgroundImage: `url('/images/tn_logistics_bg.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1220]/70 via-transparent to-[#0c1220]/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(12,18,32,0.15)_0%,rgba(12,18,32,0.75)_100%)]" />
      </div>

      {/* ==================================================================== */}
      {/* TOP BAR: Fixed Header                                                */}
      {/* ==================================================================== */}
      <header className="relative z-10 w-full px-8 py-6 flex items-center justify-between border-b border-white/10 backdrop-blur-xl bg-[#0c1220]/60">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-white">QUANTUM</span>
            <span className="text-2xl font-bold tracking-tight text-[#f39c12]">EXPRESS</span>
          </div>
          <span className="text-xs text-gray-400 font-medium tracking-wide mt-0.5">
            Enterprise B2B Freight Orchestration & State Logistics Center Platform
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
          <div className="flex items-center gap-2 bg-[#0c1220]/70 border border-amber-500/30 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#e67e22] animate-ping"></span>
            <span className="text-amber-300 font-semibold">16 State Logistics Hubs Active</span>
          </div>
          <span className="text-gray-500">© 2026</span>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* HERO / PORTAL SELECTION / LOGIN TRANSITION                           */}
      {/* ==================================================================== */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        
        {/* VIEW 1: Portal Cards Selection */}
        {!selectedPortal && (
          <div className="w-full max-w-[1240px] flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
            
            <div className="text-center mb-12">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#f39c12] bg-[#f39c12]/15 border border-[#f39c12]/30 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-md">
                Tamil Nadu Heavy Freight Gateway
              </span>
              <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight mt-4 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
                Select Your Enterprise Portal
              </h1>
              <p className="text-sm md:text-base text-gray-300 mt-3 max-w-xl mx-auto drop-shadow-md">
                Connect directly with ports, commercial fleet terminals, and automated dispatch across the state.
              </p>
            </div>

            {/* 3 Translucent Glass Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              
              {/* Card 1: B2B Shipper */}
              <div 
                onClick={() => { setSelectedPortal('shipper'); setError(''); }}
                className="group relative bg-[#0c1220]/45 hover:bg-[#0c1220]/65 backdrop-blur-xl border border-white/15 hover:border-[#e67e22]/70 rounded-2xl p-8 h-[310px] flex flex-col justify-between cursor-pointer transition-all duration-350 hover:-translate-y-2.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] hover:shadow-[0_0_40px_rgba(230,126,34,0.35)]"
              >
                <div>
                  <div className="w-14 h-14 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#e67e22] group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mt-6 group-hover:text-[#f39c12] transition-colors">
                    B2B Shipper
                  </h3>
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                    Book commercial freight, get dispatcher quotations, and manage warehouse staging across 16 state hubs.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <span className="text-sm font-semibold text-[#e67e22] flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform">
                    Enter Portal <ArrowRight className="w-4 h-4" />
                  </span>
                  <span className="text-[11px] text-gray-400 uppercase tracking-wider font-mono">CFS & Yards</span>
                </div>

                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#e67e22]/50 to-transparent group-hover:via-[#e67e22] transition-all rounded-b-2xl"></div>
              </div>

              {/* Card 2: Heavy Truck Driver */}
              <div 
                onClick={() => { setSelectedPortal('driver'); setError(''); }}
                className="group relative bg-[#0c1220]/45 hover:bg-[#0c1220]/65 backdrop-blur-xl border border-white/15 hover:border-[#e67e22]/70 rounded-2xl p-8 h-[310px] flex flex-col justify-between cursor-pointer transition-all duration-350 hover:-translate-y-2.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] hover:shadow-[0_0_40px_rgba(230,126,34,0.35)]"
              >
                <div>
                  <div className="w-14 h-14 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#e67e22] group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <Truck className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mt-6 group-hover:text-[#f39c12] transition-colors">
                    Heavy Truck Driver
                  </h3>
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                    Receive direct load dispatches, view highway routes, track trip earnings, and submit digital POD proofs.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <span className="text-sm font-semibold text-[#e67e22] flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform">
                    Enter Portal <ArrowRight className="w-4 h-4" />
                  </span>
                  <span className="text-[11px] text-gray-400 uppercase tracking-wider font-mono">RTO Network</span>
                </div>

                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#e67e22]/50 to-transparent group-hover:via-[#e67e22] transition-all rounded-b-2xl"></div>
              </div>

              {/* Card 3: Dispatcher Control Tower */}
              <div 
                onClick={() => { setSelectedPortal('dispatcher'); setError(''); }}
                className="group relative bg-[#0c1220]/45 hover:bg-[#0c1220]/65 backdrop-blur-xl border border-white/15 hover:border-[#e67e22]/70 rounded-2xl p-8 h-[310px] flex flex-col justify-between cursor-pointer transition-all duration-350 hover:-translate-y-2.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] hover:shadow-[0_0_40px_rgba(230,126,34,0.35)]"
              >
                <div>
                  <div className="w-14 h-14 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#e67e22] group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <Radio className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mt-6 group-hover:text-[#f39c12] transition-colors">
                    Dispatcher Tower
                  </h3>
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                    Full command center to monitor live fleet telemetry, approve toll quotations, assign drivers, and resolve incidents.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <span className="text-sm font-semibold text-[#e67e22] flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform">
                    Enter Portal <ArrowRight className="w-4 h-4" />
                  </span>
                  <span className="text-[11px] text-gray-400 uppercase tracking-wider font-mono">State Admin</span>
                </div>

                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#e67e22]/50 to-transparent group-hover:via-[#e67e22] transition-all rounded-b-2xl"></div>
              </div>

            </div>

          </div>
        )}

        {/* VIEW 2: Slide-in Dark Glass Login Form */}
        {selectedPortal && (
          <div className="w-full max-w-[480px] bg-[#0c1220]/80 backdrop-blur-3xl border border-white/15 rounded-2xl p-8 md:p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-400">
            
            {/* Back Button */}
            <button 
              onClick={() => { setSelectedPortal(null); setError(''); }}
              className="text-xs font-semibold text-[#e67e22] hover:text-[#f39c12] flex items-center gap-1.5 mb-6 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Portals
            </button>

            {/* Portal Title */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#e67e22] shrink-0 shadow-md">
                {selectedPortal === 'shipper' && <Building2 className="w-5 h-5" />}
                {selectedPortal === 'driver' && <Truck className="w-5 h-5" />}
                {selectedPortal === 'dispatcher' && <Radio className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {selectedPortal === 'shipper' && 'B2B Shipper Sign In'}
                  {selectedPortal === 'driver' && 'Driver Portal Access'}
                  {selectedPortal === 'dispatcher' && 'Dispatcher Control Tower'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedPortal === 'shipper' && 'Access freight bookings and quotations'}
                  {selectedPortal === 'driver' && 'Authenticate with your driver credentials'}
                  {selectedPortal === 'dispatcher' && 'State Logistics Command Center credentials'}
                </p>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* SHIPPER FORM FIELDS */}
              {selectedPortal === 'shipper' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                      Company / Shipper Name
                    </label>
                    <input
                      type="text"
                      value={shipperName}
                      onChange={(e) => setShipperName(e.target.value)}
                      placeholder="e.g. Kovai Industrial Components Ltd"
                      className="qe-glass-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                      Unique Business Code
                    </label>
                    <input
                      type="text"
                      value={businessCode}
                      onChange={(e) => setBusinessCode(e.target.value.toUpperCase())}
                      placeholder="e.g. KVI101"
                      className="qe-glass-input font-mono uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                      Shipper Account Password
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showShipperPassword ? 'text' : 'password'}
                        value={shipperPassword}
                        onChange={(e) => setShipperPassword(e.target.value)}
                        placeholder="•••••••• (min. 4 characters)"
                        className="qe-glass-input font-mono pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowShipperPassword(!showShipperPassword)}
                        className="absolute right-3 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {showShipperPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* DRIVER FORM FIELDS */}
              {selectedPortal === 'driver' && (
                <>
                  {/* District RTO 16 Hubs Grid */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-300 mb-2">
                      Operational District RTO (16 Hubs)
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {RTO_DISTRICTS.map((dist) => {
                        const isSelected = selectedRTO === dist.rto;
                        return (
                          <button
                            key={dist.rto}
                            type="button"
                            onClick={() => handleSelectRTO(dist.rto)}
                            className={`p-1.5 rounded-lg text-center transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-[#e67e22] border-[#e67e22] text-white shadow-md shadow-amber-500/25'
                                : 'bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08]'
                            }`}
                          >
                            <div className="text-[11px] font-mono font-bold">TN-{dist.rto}</div>
                            <div className="text-[9px] truncate opacity-80">{dist.name}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                      Driver Username / Badge ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={driverUsername}
                        onChange={(e) => setDriverUsername(e.target.value.toUpperCase())}
                        placeholder={`e.g. TN-${selectedRTO || '01'}-1001`}
                        className="qe-glass-input font-mono uppercase"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                      Password / Security PIN
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showDriverPassword ? 'text' : 'password'}
                        value={driverPassword}
                        onChange={(e) => setDriverPassword(e.target.value)}
                        placeholder="•••••••• (Security PIN / Password)"
                        className="qe-glass-input font-mono pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowDriverPassword(!showDriverPassword)}
                        className="absolute right-3 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {showDriverPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* DISPATCHER FORM FIELDS */}
              {selectedPortal === 'dispatcher' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                      Dispatcher Username
                    </label>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="e.g. admin"
                      className="qe-glass-input font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                      Command Center Password
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showAdminPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="•••••••• (Command Password)"
                        className="qe-glass-input font-mono pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-[#e67e22] to-[#f39c12] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Sign In to Command Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        )}

      </main>

      {/* ==================================================================== */}
      {/* FOOTER                                                               */}
      {/* ==================================================================== */}
      <footer className="relative z-10 w-full px-8 py-4 text-center text-xs text-gray-500 border-t border-white/5 backdrop-blur-md bg-[#0c1220]/60">
        Quantum Express Business Logistics Platform © 2026. 16 State Logistics & Warehousing Hubs.
      </footer>

    </div>
  );
}
