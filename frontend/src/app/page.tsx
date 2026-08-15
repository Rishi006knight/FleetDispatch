'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, Truck, Radio, ArrowRight, ArrowLeft, 
  ShieldCheck, Lock, Warehouse, Check, ChevronRight, Anchor
} from 'lucide-react';
import { TAMIL_NADU_WAREHOUSES } from './constants/locations';

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

const SAMPLE_B2B_BUSINESSES = [
  { code: 'ABC123', name: 'ABC Global Logistics & Freight Ltd' },
  { code: 'KVI101', name: 'Kovai Industrial Components Ltd' },
  { code: 'CHE001', name: 'Chennai Port Container Exporters' },
  { code: 'MDU909', name: 'Madurai Spun Silk & Textiles' },
];

export default function LandingLoginPage() {
  const router = useRouter();
  
  // Selected portal state ('shipper' | 'driver' | 'dispatcher' | null)
  const [selectedPortal, setSelectedPortal] = useState<'shipper' | 'driver' | 'dispatcher' | null>(null);

  // Form inputs
  const [shipperName, setShipperName] = useState('ABC Global Logistics & Freight Ltd');
  const [businessCode, setBusinessCode] = useState('ABC123');

  const [selectedRTO, setSelectedRTO] = useState('01');
  const [selectedUnit, setSelectedUnit] = useState('1001');
  const [driverUsername, setDriverUsername] = useState('TN-01-1001');
  const [driverPassword, setDriverPassword] = useState('drivertn01');

  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin123');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectRTO = (rto: string) => {
    setSelectedRTO(rto);
    setDriverUsername(`TN-${rto}-${selectedUnit}`);
    setDriverPassword(`drivertn${rto}`);
    setError('');
  };

  const handleSelectUnit = (unit: string) => {
    setSelectedUnit(unit);
    setDriverUsername(`TN-${selectedRTO}-${unit}`);
    setError('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      if (selectedPortal === 'dispatcher') {
        const cleanUser = adminUsername.trim().toUpperCase();
        const cleanPass = adminPassword.trim().toLowerCase();
        if (cleanUser === 'ADMIN' && (cleanPass === 'admin123' || cleanPass === 'admin')) {
          localStorage.setItem('user_role', 'admin');
          localStorage.setItem('user_name', 'Quantum Express Control Tower Dispatcher');
          router.push('/admin');
        } else {
          setIsSubmitting(false);
          setError('Invalid dispatcher credentials. Use "admin" / "admin123"');
        }
      } else if (selectedPortal === 'driver') {
        const cleanUpperUser = driverUsername.trim().toUpperCase();
        const rtoMatch = cleanUpperUser.match(/^TN-(\d{2})-(\d{4})$/);
        
        if (!rtoMatch) {
          setIsSubmitting(false);
          setError('Username must follow pattern: TN-XX-1001 (e.g. TN-01-1001)');
          return;
        }

        const rtoCode = rtoMatch[1];
        const driverUnit = rtoMatch[2];
        const matchedDistrict = RTO_DISTRICTS.find(d => d.rto === rtoCode) || RTO_DISTRICTS[0];

        const driverName = `Driver #${driverUnit} (${matchedDistrict.name} Hub - ${cleanUpperUser})`;
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

        if (!cleanCode || cleanCode.length < 3) {
          setIsSubmitting(false);
          setError('Please provide a valid unique Business Code (e.g. ABC123)');
          return;
        }

        if (!cleanName) {
          setIsSubmitting(false);
          setError('Please enter your Company / Shipper Business Name');
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
      {/* BACKGROUND: Accurate Tamil Nadu Layered Logistics Background          */}
      {/* ==================================================================== */}
      <div className="tn-map-bg">
        
        {/* Soft Radial Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[550px] bg-gradient-to-tr from-amber-500/5 via-blue-900/10 to-transparent rounded-full blur-3xl opacity-40"></div>

        <svg 
          viewBox="0 0 350 480" 
          className="pointer-events-none"
        >
          <defs>
            <filter id="hubSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Accurate, recognizable Tamil Nadu State Shape with 3% amber fill & 15% border */}
          <path 
            d="M 200 30 
               C 220 28, 260 50, 275 80 
               C 285 100, 280 130, 285 170 
               C 290 200, 275 235, 255 260 
               C 245 275, 225 305, 210 335 
               C 200 360, 185 395, 170 420 
               C 155 445, 130 435, 120 400 
               C 110 365, 125 330, 140 300 
               C 150 280, 140 260, 125 230 
               C 110 200, 115 165, 135 135 
               C 150 110, 160 80, 175 55 
               C 185 38, 190 32, 200 30 Z"
            fill="rgba(230, 126, 34, 0.03)"
            stroke="rgba(230, 126, 34, 0.15)"
            strokeWidth="1.5"
          />

          {/* Static Connection Lines — 8% opacity, thin, NO spinning */}
          <g stroke="rgba(230, 126, 34, 0.08)" strokeWidth="1" fill="none">
            {/* Chennai -> Ennore */}
            <line x1="275" y1="80" x2="278" y2="62" />
            {/* Chennai -> Koyambedu -> Tambaram */}
            <line x1="275" y1="80" x2="265" y2="92" />
            <line x1="265" y1="92" x2="255" y2="115" />
            {/* Chennai -> Vellore -> Hosur */}
            <line x1="275" y1="80" x2="215" y2="105" />
            <line x1="215" y1="105" x2="168" y2="115" />
            {/* Vellore -> Salem -> Erode -> Tiruppur -> Coimbatore */}
            <line x1="215" y1="105" x2="195" y2="175" />
            <line x1="195" y1="175" x2="168" y2="205" />
            <line x1="168" y1="205" x2="150" y2="218" />
            <line x1="150" y1="218" x2="130" y2="228" />
            {/* Salem -> Trichy -> Thanjavur */}
            <line x1="195" y1="175" x2="215" y2="238" />
            <line x1="215" y1="238" x2="250" y2="245" />
            {/* Trichy -> Madurai -> Tirunelveli -> Thoothukudi -> Nagercoil */}
            <line x1="215" y1="238" x2="190" y2="300" />
            <line x1="190" y1="300" x2="175" y2="365" />
            <line x1="175" y1="365" x2="210" y2="355" />
            <line x1="175" y1="365" x2="155" y2="418" />
          </g>

          {/* Hub Dots — only Chennai Port has a subtle pulse, rest are quiet */}
          <g>
            {/* Chennai Port (Main Hub - 4px, subtle slow pulse) */}
            <circle cx="275" cy="80" r="5.5" fill="none" stroke="#e67e22" strokeWidth="1" opacity="0.4" className="qe-hub-dot" />
            <circle cx="275" cy="80" r="2.5" fill="#e67e22" opacity="0.7" filter="url(#hubSoftGlow)" />

            {/* Ennore Port (4px, 65% opacity) */}
            <circle cx="278" cy="62" r="2.5" fill="#e67e22" opacity="0.65" filter="url(#hubSoftGlow)" />

            {/* Thoothukudi Port (4px, 65% opacity) */}
            <circle cx="210" cy="355" r="2.5" fill="#e67e22" opacity="0.65" filter="url(#hubSoftGlow)" />

            {/* Primary Gateways (Orange, 3px, 50% opacity) */}
            <circle cx="265" cy="92" r="2" fill="#f39c12" opacity="0.5" />
            <circle cx="255" cy="115" r="2" fill="#f39c12" opacity="0.5" />

            {/* Industrial Hubs (Blue, 3px, 50% opacity) */}
            <circle cx="215" cy="105" r="2" fill="#3b82f6" opacity="0.5" />
            <circle cx="168" cy="115" r="2" fill="#3b82f6" opacity="0.5" />
            <circle cx="195" cy="175" r="2" fill="#3b82f6" opacity="0.5" />
            <circle cx="168" cy="205" r="2" fill="#3b82f6" opacity="0.5" />
            <circle cx="150" cy="218" r="2" fill="#3b82f6" opacity="0.5" />
            <circle cx="130" cy="228" r="2" fill="#3b82f6" opacity="0.5" />

            {/* Regional Hubs (Teal, 3px, 50% opacity) */}
            <circle cx="215" cy="238" r="2" fill="#14b8a6" opacity="0.5" />
            <circle cx="250" cy="245" r="2" fill="#14b8a6" opacity="0.5" />
            <circle cx="190" cy="300" r="2" fill="#14b8a6" opacity="0.5" />
            <circle cx="175" cy="365" r="2" fill="#14b8a6" opacity="0.5" />
            <circle cx="155" cy="418" r="2" fill="#14b8a6" opacity="0.5" />
          </g>
        </svg>

        {/* Bottom soft gradient fade */}
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#0c1220] to-transparent"></div>
      </div>



      {/* ==================================================================== */}
      {/* TOP BAR: Fixed Header                                                */}
      {/* ==================================================================== */}
      <header className="relative z-10 w-full px-8 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-[#0c1220]/60">
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
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#e67e22] animate-ping"></span>
            <span>16 State Logistics & Warehousing Hubs</span>
          </div>
          <span className="text-gray-500">© 2026</span>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* HERO / PORTAL SELECTION / LOGIN TRANSITION                           */}
      {/* ==================================================================== */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        
        {/* VIEW 1: 3 Glass Portal Cards (Initial State) */}
        {!selectedPortal && (
          <div className="w-full max-w-[1240px] flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
            
            <div className="text-center mb-12">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#f39c12] bg-[#f39c12]/10 border border-[#f39c12]/20 px-3 py-1 rounded-full">
                Tamil Nadu Heavy Freight Gateway
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mt-3">
                Select Your Enterprise Portal
              </h1>
              <p className="text-sm text-gray-400 mt-2 max-w-xl mx-auto">
                Connect directly with ports, commercial fleet terminals, and automated dispatch across the state.
              </p>
            </div>

            {/* 3 Dark Glass Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              
              {/* Card 1: B2B Shipper */}
              <div 
                onClick={() => setSelectedPortal('shipper')}
                className="group relative bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-2xl border border-white/10 hover:border-[#e67e22]/50 rounded-2xl p-8 h-[300px] flex flex-col justify-between cursor-pointer transition-all duration-350 hover:-translate-y-2.5 hover:shadow-[0_0_40px_rgba(230,126,34,0.25)]"
              >
                <div>
                  <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#e67e22] group-hover:scale-110 transition-transform duration-300">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mt-6 group-hover:text-[#f39c12] transition-colors">
                    B2B Shipper
                  </h3>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    Book commercial freight, get dispatcher quotations, and manage warehouse staging across 16 state hubs.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-sm font-semibold text-[#e67e22] flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform">
                    Enter Portal <ArrowRight className="w-4 h-4" />
                  </span>
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider font-mono">CFS & Yards</span>
                </div>

                {/* Bottom Decorative Gradient Line */}
                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#e67e22]/40 to-transparent group-hover:via-[#e67e22] transition-all rounded-b-2xl"></div>
              </div>

              {/* Card 2: Heavy Truck Driver */}
              <div 
                onClick={() => setSelectedPortal('driver')}
                className="group relative bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-2xl border border-white/10 hover:border-[#e67e22]/50 rounded-2xl p-8 h-[300px] flex flex-col justify-between cursor-pointer transition-all duration-350 hover:-translate-y-2.5 hover:shadow-[0_0_40px_rgba(230,126,34,0.25)]"
              >
                <div>
                  <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#e67e22] group-hover:scale-110 transition-transform duration-300">
                    <Truck className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mt-6 group-hover:text-[#f39c12] transition-colors">
                    Heavy Truck Driver
                  </h3>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    Receive direct load dispatches, view highway routes, track trip earnings, and submit digital POD proofs.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-sm font-semibold text-[#e67e22] flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform">
                    Enter Portal <ArrowRight className="w-4 h-4" />
                  </span>
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider font-mono">RTO Network</span>
                </div>

                {/* Bottom Decorative Gradient Line */}
                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#e67e22]/40 to-transparent group-hover:via-[#e67e22] transition-all rounded-b-2xl"></div>
              </div>

              {/* Card 3: Dispatcher Control Tower */}
              <div 
                onClick={() => setSelectedPortal('dispatcher')}
                className="group relative bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-2xl border border-white/10 hover:border-[#e67e22]/50 rounded-2xl p-8 h-[300px] flex flex-col justify-between cursor-pointer transition-all duration-350 hover:-translate-y-2.5 hover:shadow-[0_0_40px_rgba(230,126,34,0.25)]"
              >
                <div>
                  <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#e67e22] group-hover:scale-110 transition-transform duration-300">
                    <Radio className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mt-6 group-hover:text-[#f39c12] transition-colors">
                    Dispatcher Tower
                  </h3>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    Full command center to monitor live fleet telemetry, approve toll quotations, assign drivers, and resolve incidents.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-sm font-semibold text-[#e67e22] flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform">
                    Enter Portal <ArrowRight className="w-4 h-4" />
                  </span>
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider font-mono">State Admin</span>
                </div>

                {/* Bottom Decorative Gradient Line */}
                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#e67e22]/40 to-transparent group-hover:via-[#e67e22] transition-all rounded-b-2xl"></div>
              </div>

            </div>

          </div>
        )}

        {/* VIEW 2: Slide-in Dark Glass Login Form */}
        {selectedPortal && (
          <div className="w-full max-w-[500px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-400">
            
            {/* Back Button */}
            <button 
              onClick={() => { setSelectedPortal(null); setError(''); }}
              className="text-xs font-semibold text-[#e67e22] hover:text-[#f39c12] flex items-center gap-1.5 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Portals
            </button>

            {/* Portal Title */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#e67e22]">
                {selectedPortal === 'shipper' && <Building2 className="w-5 h-5" />}
                {selectedPortal === 'driver' && <Truck className="w-5 h-5" />}
                {selectedPortal === 'dispatcher' && <Radio className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selectedPortal === 'shipper' && 'B2B Shipper Sign In'}
                  {selectedPortal === 'driver' && 'Heavy Truck Driver Sign In'}
                  {selectedPortal === 'dispatcher' && 'Dispatcher Control Tower'}
                </h2>
                <p className="text-xs text-gray-400">
                  {selectedPortal === 'shipper' && 'Access freight booking & quotation bills'}
                  {selectedPortal === 'driver' && 'Select your TN District RTO & Station Unit'}
                  {selectedPortal === 'dispatcher' && 'State Logistics Command Center credentials'}
                </p>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              
              {/* SHIPPER FORM FIELDS */}
              {selectedPortal === 'shipper' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-1.5">
                      Company / Shipper Name
                    </label>
                    <input
                      type="text"
                      value={shipperName}
                      onChange={(e) => setShipperName(e.target.value)}
                      placeholder="e.g. ABC Global Logistics & Freight Ltd"
                      className="qe-glass-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-1.5">
                      Unique Business Code
                    </label>
                    <input
                      type="text"
                      value={businessCode}
                      onChange={(e) => setBusinessCode(e.target.value.toUpperCase())}
                      placeholder="e.g. ABC123"
                      className="qe-glass-input font-mono uppercase"
                      required
                    />
                  </div>

                  {/* Quick Select Shipper Demo Accounts */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                      Quick Business Select
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SAMPLE_B2B_BUSINESSES.map((b) => (
                        <button
                          key={b.code}
                          type="button"
                          onClick={() => {
                            setBusinessCode(b.code);
                            setShipperName(b.name);
                          }}
                          className={`p-2 rounded-lg text-left text-xs border transition-all ${
                            businessCode === b.code
                              ? 'bg-amber-500/20 border-[#e67e22] text-amber-200'
                              : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="font-bold font-mono text-[11px]">{b.code}</div>
                          <div className="text-[10px] truncate">{b.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* DRIVER FORM FIELDS */}
              {selectedPortal === 'driver' && (
                <>
                  {/* District RTO 4x4 Grid */}
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-2">
                      Select District RTO (16 Hubs)
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {RTO_DISTRICTS.map((dist) => {
                        const isSelected = selectedRTO === dist.rto;
                        return (
                          <button
                            key={dist.rto}
                            type="button"
                            onClick={() => handleSelectRTO(dist.rto)}
                            className={`p-2 rounded-lg text-center transition-all border ${
                              isSelected
                                ? 'bg-[#e67e22] border-[#e67e22] text-white shadow-lg shadow-amber-500/30'
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

                  {/* Unit Selector Pills */}
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-1.5">
                      Station Truck Unit
                    </label>
                    <div className="flex gap-2">
                      {['1001', '1002', '1003', '1004'].map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => handleSelectUnit(unit)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                            selectedUnit === unit
                              ? 'bg-amber-500/20 border-[#e67e22] text-amber-300'
                              : 'bg-white/[0.03] border-white/10 text-gray-400 hover:bg-white/[0.06]'
                          }`}
                        >
                          #{unit}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-1.5">
                      Username (Vehicle Badge)
                    </label>
                    <input
                      type="text"
                      value={driverUsername}
                      onChange={(e) => setDriverUsername(e.target.value.toUpperCase())}
                      className="qe-glass-input font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-1.5">
                      Password / Security PIN
                    </label>
                    <input
                      type="password"
                      value={driverPassword}
                      onChange={(e) => setDriverPassword(e.target.value)}
                      placeholder="e.g. drivertn01 or driver123"
                      className="qe-glass-input font-mono"
                      required
                    />
                  </div>
                </>
              )}

              {/* DISPATCHER FORM FIELDS */}
              {selectedPortal === 'dispatcher' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-1.5">
                      Dispatcher Admin Username
                    </label>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="qe-glass-input font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-1.5">
                      Command Center Password
                    </label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="qe-glass-input font-mono"
                      required
                    />
                  </div>

                  {/* Demo Helper Button */}
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex items-center justify-between text-xs text-amber-200">
                    <span>Default demo: <strong>admin</strong> / <strong>admin123</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminUsername('admin');
                        setAdminPassword('admin123');
                      }}
                      className="px-2.5 py-1 bg-amber-500 text-white rounded font-medium hover:bg-amber-600 transition-colors"
                    >
                      Fill Credentials
                    </button>
                  </div>
                </>
              )}

              {/* Submit Button */}
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
