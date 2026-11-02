'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Car, Eye, EyeOff, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import Image from 'next/image';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // If already logged in with a valid token, auto-redirect directly to dashboard
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (token) {
      api.get('/auth/verify')
        .then(() => {
          router.replace('/admin/dashboard');
        })
        .catch(() => {
          localStorage.removeItem('admin_token');
          document.cookie = 'token=; path=/; max-age=0;';
        });
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.token) {
        localStorage.setItem('admin_token', res.data.token);
        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
        document.cookie = `token=${res.data.token}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      }
      toast.success('Login successful!');
      router.replace('/admin/dashboard');
    } catch (err) {
      let errorMsg = err.response?.data?.error;
      if (typeof errorMsg === 'object') errorMsg = errorMsg.message || 'Server error';
      toast.error(errorMsg || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-black text-white selection:bg-white/30">
      
      {/* Back to Home Button */}
      <div className="absolute top-6 left-4 sm:left-8 z-20">
        <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 text-sm font-medium hover:-translate-x-1 shadow-lg">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>
      
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/login-bg.png" 
          alt="Luxury Car Showroom" 
          fill 
          className="object-cover opacity-60"
          priority
        />
        {/* Deep vignette gradient for focus */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
      </div>

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-md hero-enter">
        <div className="bg-black/40 backdrop-blur-[40px] border border-white/10 p-8 sm:p-10 rounded-[2rem] shadow-2xl">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-5 backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              <Lock size={28} className="text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: 'var(--font-outfit)' }}>
              Administrator
            </h1>
            <p className="text-white/60 text-sm tracking-wide">
              Hariram Motors Secure Access
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-widest pl-1">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="admin@hariramcars.com" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all backdrop-blur-sm"
                required 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-widest pl-1">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all backdrop-blur-sm !pr-14"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)} 
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-white text-black hover:bg-gray-200 font-semibold rounded-2xl px-5 py-4 mt-4 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-1 shadow-[0_10px_40px_rgba(255,255,255,0.15)] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Authenticating...' : (
                <>
                  Sign In
                  <ArrowRight size={18} strokeWidth={2} />
                </>
              )}
            </button>
          </form>

        </div>
        
        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/40 text-xs flex items-center justify-center gap-2">
            <Car size={14} />
            &copy; {new Date().getFullYear()} Hariram Motors
          </p>
        </div>
      </div>
    </div>
  );
}
