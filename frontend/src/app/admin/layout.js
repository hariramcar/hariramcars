'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Car, MessageSquare, HandCoins, Image, Users, Settings, LogOut, Menu, X, ChevronRight, Tags } from 'lucide-react';
import api from '@/lib/api';

const adminNav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/inventory', label: 'Inventory', icon: Car },
  { href: '/admin/brands', label: 'Brands & Models', icon: Tags },
  { href: '/admin/sell-requests', label: 'Sell Requests', icon: HandCoins },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/happy-customers', label: 'Testimonials', icon: Users },
  { href: '/admin/banners', label: 'Banners', icon: Image },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await api.get('/auth/verify');
        setUser(res.data.user);
      } catch {
        if (pathname !== '/admin/login') {
          router.push('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
    }
    window.location.href = '/admin/login';
  };

  // Login page — no sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const adminThemeVars = {
    '--color-bg-dark': '#0a0a12',
    '--color-bg-card': '#15121b',
    '--color-bg-card-hover': 'rgba(255, 255, 255, 0.04)',
    '--color-border': 'rgba(255, 255, 255, 0.08)',
    '--color-text-primary': '#ffffff',
    '--color-text-secondary': '#a1a1aa',
    '--color-text-muted': '#71717a',
    '--color-primary': '#7c3aed',
    '--color-accent-red': '#ef4444',
  };

  if (loading) {
    return (
      <div className="dark admin-theme min-h-screen flex items-center justify-center bg-[var(--color-bg-dark)]" style={adminThemeVars}>
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="dark admin-theme min-h-screen bg-[var(--color-bg-dark)] text-[var(--color-text-primary)] flex" style={adminThemeVars}>
      {/* Sidebar */}
      <aside className={`fixed lg:sticky lg:top-0 h-screen shrink-0 inset-y-0 left-0 z-50 w-64 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
                <Car size={18} className="text-[#0f0f1a]" />
              </div>
              <span className="text-sm font-bold">Admin Panel</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[var(--color-text-muted)]">
              <X size={20} />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${pathname === item.href || (item.href !== '/admin/dashboard' && pathname?.startsWith(item.href))
                  ? 'bg-[rgba(226,176,74,0.1)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
                  }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Verified User Profile & Logout */}
          <div className="p-4 border-t border-[var(--color-border)]">
            <div className="bg-[#12121a] border border-white/5 rounded-2xl p-3 shadow-inner relative overflow-hidden group/profile">
              {/* Subtle animated background glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-purple-500/5 blur-3xl opacity-0 group-hover/profile:opacity-100 transition-opacity duration-700"></div>

              <div className="flex items-center gap-3 relative z-10">
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur opacity-60"></div>
                  <div className="w-10 h-10 relative rounded-full bg-[#0a0a10] border border-white/10 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate tracking-wide">{user.name}</p>
                  <p className="text-xs text-purple-400/70 truncate font-medium">{user.email}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="relative z-10 group flex items-center justify-center gap-2 w-full py-2.5 mt-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all duration-300 border border-red-500/10 hover:border-red-500/30"
              >
                <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-semibold text-sm">Secure Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile Top Bar (Hidden on Desktop) */}
        <header className="lg:hidden h-16 bg-[var(--color-bg-card)] border-b border-[var(--color-border)] flex items-center px-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            <Menu size={22} />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
