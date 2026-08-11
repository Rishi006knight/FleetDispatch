'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Truck, UserCircle2, ArrowRight, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'admin' | 'driver' | 'customer'>('customer');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === 'admin') {
      if (username === 'admin' && password === 'admin123') {
        localStorage.setItem('user_role', 'admin');
        localStorage.setItem('user_name', 'System Dispatcher');
        router.push('/admin');
      } else {
        setError('Invalid dispatcher credentials. Hint: admin / admin123');
      }
    } else if (role === 'driver') {
      if (username === 'driver' && password === 'driver123') {
        localStorage.setItem('user_role', 'driver');
        localStorage.setItem('user_name', 'Express Driver #D101');
        localStorage.setItem('driver_id', 'DRV-101'); // link to a seed driver
        router.push('/driver');
      } else {
        setError('Invalid driver credentials. Hint: driver / driver123');
      }
    } else {
      // Customer login: no auth required
      localStorage.setItem('user_role', 'customer');
      localStorage.setItem('user_name', username || 'Guest Customer');
      router.push('/customer');
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl mb-4">
            <Truck className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            QUANTUM<span className="text-cyan-400">EXPRESS</span>
          </h1>
          <p className="mt-2 text-zinc-400 text-sm">
            AI-Powered Intelligent Fleet Orchestration & Logistics Engine
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-8 backdrop-blur-md shadow-2xl">
          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-zinc-950 border border-zinc-800 rounded-xl mb-6">
            <button
              onClick={() => { setRole('customer'); setError(''); }}
              className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-xs font-semibold transition-all ${
                role === 'customer'
                  ? 'bg-cyan-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <UserCircle2 className="w-4 h-4 mb-1" />
              Customer
            </button>
            <button
              onClick={() => { setRole('driver'); setError(''); }}
              className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-xs font-semibold transition-all ${
                role === 'driver'
                  ? 'bg-cyan-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Truck className="w-4 h-4 mb-1" />
              Driver
            </button>
            <button
              onClick={() => { setRole('admin'); setError(''); }}
              className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-xs font-semibold transition-all ${
                role === 'admin'
                  ? 'bg-cyan-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 mb-1" />
              Dispatcher
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {role === 'customer' ? (
              <div className="space-y-4">
                <p className="text-zinc-400 text-xs text-center border border-zinc-800 p-3 bg-zinc-950/50 rounded-xl">
                  Quick access for customer orders and live tracking. No credentials required to book.
                </p>
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-1">Your Full Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="Enter guest name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 text-white placeholder-zinc-600"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder={role === 'admin' ? 'Dispatcher Username' : 'Driver Username'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 text-white placeholder-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 text-white placeholder-zinc-600"
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-zinc-600" /> Secure credentials validation
                  </span>
                  <span>Demo Hint: {role === 'admin' ? 'admin / admin123' : 'driver / driver123'}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="text-rose-500 text-xs bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 group"
            >
              Enter Dashboard
              <ArrowRight className="w-4 h-4 text-zinc-950 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-zinc-600 text-[11px]">
          Quantum Express Logistics Corp &copy; 2026. Built with Next.js, FastAPI, scikit-learn, Leaflet, and MongoDB Atlas.
        </div>
      </div>
    </div>
  );
}
