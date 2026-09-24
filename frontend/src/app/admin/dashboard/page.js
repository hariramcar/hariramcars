'use client';

import { useEffect, useState } from 'react';
import { Car, MessageSquare, HandCoins, Users, TrendingUp, ArrowRight, ExternalLink, Trash2, Home, Edit, Eye, Activity, HardDrive, Database, AlertTriangle, Download, Cloud, ShieldCheck, Zap, Globe, Sparkles } from 'lucide-react';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { extractImageUrl, getOptimizedImage } from '@/lib/utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ cars: 0, messages: 0, unread: 0, sellRequests: 0, customers: 0, appInstalls: 0 });
  const [isMobile, setIsMobile] = useState(true);

  const [trafficData, setTrafficData] = useState([]);
  const [storageStats, setStorageStats] = useState(null);
  const [featuredCars, setFeaturedCars] = useState([]);
  const [featuredTotal, setFeaturedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);

    const fetch = async () => {
      try {
        const [carsRes, msgRes, sellRes, custRes, featuredRes, analyticsRes, storageRes, appInstallsRes] = await Promise.allSettled([
          api.get('/cars?limit=1'), // Just for total count
          api.get('/messages?limit=1'),
          api.get('/sell-requests?limit=1'),
          api.get('/happy-customers/all'),
          api.get('/cars?limit=5&featured=true'),
          api.get('/analytics/summary'),
          api.get('/analytics/storage'),
          api.get('/analytics/app-installs/total')
        ]);

        setStats({
          cars: carsRes.status === 'fulfilled' ? carsRes.value.data.total : 0,
          messages: msgRes.status === 'fulfilled' ? msgRes.value.data.total : 0,
          unread: msgRes.status === 'fulfilled' ? msgRes.value.data.unreadCount : 0,
          sellRequests: sellRes.status === 'fulfilled' ? sellRes.value.data.total : 0,
          customers: custRes.status === 'fulfilled' ? custRes.value.data.length : 0,
          appInstalls: appInstallsRes.status === 'fulfilled' ? appInstallsRes.value.data.total : 0,
        });
        if (featuredRes.status === 'fulfilled') {
          setFeaturedCars(featuredRes.value.data.cars || []);
          setFeaturedTotal(featuredRes.value.data.total || 0);
        }
        if (analyticsRes.status === 'fulfilled') {
          setTrafficData(analyticsRes.value.data || []);
        }
        if (storageRes.status === 'fulfilled') {
          setStorageStats(storageRes.value.data);
        }
      } catch { }
      setLoading(false);
    };
    fetch();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleRemoveFromFeatured = async (id) => {
    try {
      await api.put(`/cars/${id}`, { isFeatured: false });
      setFeaturedCars(prev => prev.filter(car => car._id !== id));
      setFeaturedTotal(prev => prev - 1);
      toast.success('Removed from homescreen');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await api.delete(`/cars/${id}`);
      setFeaturedCars(prev => prev.filter(car => car._id !== id));
      setFeaturedTotal(prev => prev - 1);
      setStats(prev => ({ ...prev, cars: prev.cars - 1 }));
      toast.success('Vehicle deleted successfully');
    } catch (err) {
      toast.error('Failed to delete vehicle');
    }
  };

  const cards = [
    { icon: Car, label: 'Total Inventory', value: stats.cars, subtext: 'Active Listings', color: 'text-purple-400', bg: 'bg-purple-500/10', glow: 'shadow-[0_0_30px_rgba(168,85,247,0.15)]' },
    { icon: MessageSquare, label: 'New Messages', value: stats.unread, subtext: `${stats.messages} total received`, color: 'text-blue-400', bg: 'bg-blue-500/10', glow: 'shadow-[0_0_30px_rgba(96,165,250,0.15)]' },
    { icon: HandCoins, label: 'Sell Requests', value: stats.sellRequests, subtext: 'Pending evaluations', color: 'text-emerald-400', bg: 'bg-emerald-500/10', glow: 'shadow-[0_0_30px_rgba(52,211,153,0.15)]' },
    { icon: Download, label: 'App Installs', value: stats.appInstalls, subtext: 'Total PWA installations', color: 'text-orange-400', bg: 'bg-orange-500/10', glow: 'shadow-[0_0_30px_rgba(249,115,22,0.15)]' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* Verified Header */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-[#1a1a2e] to-[#0d0d16] border border-white/5 shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/20 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 blur-[60px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 tracking-tight" style={{ fontFamily: 'var(--font-outfit)' }}>
              {greeting}, Admin.
            </h1>
            <p className="text-sm text-gray-400">Here's what's happening at Hariram Motors today.</p>
          </div>
          <a href="/admin/inventory/add" className="btn-primary py-2 px-4 text-sm w-fit group flex items-center gap-2 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all">
            <span>+ Add New Vehicle</span>
          </a>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className={`relative overflow-hidden bg-[#12121a] border border-white/5 rounded-2xl p-4 sm:p-5 hover:-translate-y-1 transition-all duration-300 ${card.glow}`}>
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <div className={`p-2 sm:p-2.5 rounded-xl ${card.bg}`}>
                <card.icon size={20} className={card.color} />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-white tracking-tight">{loading ? '—' : card.value}</p>
              <h3 className="text-[11px] sm:text-xs font-semibold text-gray-300 mt-1 truncate">{card.label}</h3>
              <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5 truncate">{card.subtext}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Traffic Graph Section */}
      <div className="bg-[#12121a] border border-white/5 rounded-2xl overflow-hidden shadow-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity size={18} className="text-blue-400" />
              Website Traffic Growth
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Daily visitor analytics over the last {isMobile ? '7' : '30'} days.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500/80"></div>
              <span className="text-gray-300">Visitors</span>
            </div>
          </div>
        </div>

        <div className="w-full h-[250px] sm:h-[300px]">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart
                data={isMobile ? trafficData.slice(-7) : trafficData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>

                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a24', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="visitors" name="Visitors" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPageViews)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* System Infrastructure & Cloud Storage Health */}
      <div className="bg-[#12121a] border border-white/5 rounded-2xl overflow-hidden shadow-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Cloud size={18} className="text-orange-400" />
              Cloud Infrastructure & Storage Health
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Real-time health monitoring of MongoDB Database and Cloudflare R2 Media Storage.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Cloudflare R2: Active
            </span>
          </div>
        </div>

        {/* Global Cloudflare R2 Status Banner */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-emerald-500/10 border border-orange-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-orange-500/20 rounded-xl shrink-0 border border-orange-500/30">
              <Zap size={20} className="text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Cloudflare R2 Object Storage</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  Zero Egress Fees
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                All car photos are hosted on Cloudflare R2 with <strong>Unlimited Bandwidth ($0.00 Egress)</strong>. ImageKit limits and overage costs are completely removed.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0 text-xs">
            <div className="flex items-center gap-1.5 text-gray-300">
              <Globe size={14} className="text-cyan-400" />
              <span>Edge CDN: <strong>Cached</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-300">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Bandwidth: <strong className="text-emerald-400">Unlimited</strong></span>
            </div>
          </div>
        </div>

        {storageStats && storageStats.mongodb.percentage >= 80 && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-pulse">
            <div className="p-2 bg-red-500/20 rounded-lg shrink-0">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-400">Critical Database Storage Warning</h3>
              <p className="text-xs text-red-300 mt-1 leading-relaxed">
                Your MongoDB storage has exceeded 80% capacity. Please contact your developer team to upgrade or clear database storage.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MongoDB */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database size={15} className="text-emerald-400" /> Database (MongoDB Atlas)
                </h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${storageStats && storageStats.mongodb.percentage > 80 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {storageStats ? `${storageStats.mongodb.percentage}% Used` : 'Loading...'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">Stores cars, user messages, and platform analytics.</p>
              <div className="w-full bg-[#1a1a24] rounded-full h-2.5 mb-2 overflow-hidden">
                <div 
                  className={`h-2.5 rounded-full ${storageStats && storageStats.mongodb.percentage > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${storageStats ? Math.min(storageStats.mongodb.percentage, 100) : 0}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 pt-2 border-t border-white/5 mt-3">
              <span>Used: <strong className="text-white">{storageStats ? `${storageStats.mongodb.usedMB} MB` : '0 MB'}</strong></span>
              <span>Free: <strong className="text-white">{storageStats ? `${(storageStats.mongodb.totalMB - storageStats.mongodb.usedMB).toFixed(2)} MB` : '0 MB'}</strong></span>
            </div>
          </div>

          {/* Media (Cloudflare R2) */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cloud size={15} className="text-orange-400" /> Media (Cloudflare R2)
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {storageStats?.r2?.status || 'Optimal'}
              </span>
            </div>

            {/* Storage Progress */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                  Storage Pool ({storageStats?.r2?.fileCount || 0} Photos)
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  {storageStats?.r2?.percentage || '0.3'}% Used
                </span>
              </div>
              <div className="w-full bg-[#1a1a24] rounded-full h-2.5 mb-2 overflow-hidden">
                <div 
                  className="h-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                  style={{ width: `${storageStats?.r2 ? Math.max(storageStats.r2.percentage, 1) : 1}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>Used: <strong className="text-white">{storageStats?.r2?.usedMB || 0} MB</strong></span>
                <span>Free: <strong className="text-white">{(10240 - (storageStats?.r2?.usedMB || 0)).toFixed(0)} MB</strong> (of 10 GB)</span>
              </div>
            </div>

            {/* Bandwidth Status */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider block">Monthly Bandwidth</span>
                <span className="text-xs text-gray-300">Data Transfer (Egress)</span>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <ShieldCheck size={13} /> Unlimited ($0 Egress)
                </span>
                <span className="text-[10px] text-gray-500 block mt-0.5">Never limits or expires</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Inventory List */}
      <div className="bg-[#12121a] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/[0.02]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-purple-400" />
              Homepage Featured Fleet
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{featuredTotal} verified vehicles showcased on the homepage.</p>
          </div>
          <a href="/admin/inventory" className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
            View Complete Inventory <ArrowRight size={14} />
          </a>
        </div>

        <div className="p-0 sm:p-1">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : featuredCars.length > 0 ? (
            <div className="flex flex-col">
              {featuredCars.map((car) => (
                <div key={car._id} className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 mx-2 my-1 rounded-xl hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/5">

                  <div className="flex flex-row items-center gap-3 w-full sm:w-auto flex-1 min-w-0">
                    {/* Thumbnail */}
                    <div className="w-16 h-12 sm:w-24 sm:h-14 bg-[#1a1a24] rounded-lg overflow-hidden relative shrink-0 flex items-center justify-center border border-white/5">
                      <Car size={18} className="text-gray-600 absolute" />
                      {car.images?.[0] && (
                        <img
                          src={getOptimizedImage(extractImageUrl(car.images[0]), 200)}
                          alt=""
                          className="w-full h-full object-cover relative z-10 group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { e.target.style.opacity = '0'; }}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                        {car.make} {car.model} {car.year ? `(${car.year})` : ''}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-md">
                          {car.price ? `₹${(car.price / 100000).toFixed(2)} Lakhs` : 'Price N/A'}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-gray-500"></span> {car.kms?.toLocaleString() || '0'} km</span>
                          <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-gray-500"></span> {car.fuelType || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-full sm:w-auto flex items-center justify-end sm:opacity-0 group-hover:opacity-100 transition-opacity gap-1.5 border-t border-white/5 sm:border-t-0 pt-2 sm:pt-0">
                    <a
                      href={`/catalog/${car.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 border border-transparent transition-all"
                      title="View Public Page"
                    >
                      <Eye size={14} />
                    </a>
                    <button
                      onClick={() => handleRemoveFromFeatured(car._id)}
                      className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-white/5 hover:bg-orange-500/20 text-gray-400 hover:text-orange-400 border border-transparent transition-all"
                      title="Remove from homescreen"
                    >
                      <Home size={14} />
                    </button>
                    <a
                      href={`/admin/inventory/edit/${car._id}`}
                      className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 border border-transparent transition-all"
                      title="Edit Vehicle"
                    >
                      <Edit size={14} />
                    </a>
                    <button
                      onClick={() => handleDelete(car._id)}
                      className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-transparent transition-all"
                      title="Delete Vehicle"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
                <Car size={32} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Featured Vehicles</h3>
              <p className="text-gray-400 mb-6 max-w-sm mx-auto">You haven't marked any vehicles to be featured on the public homepage yet.</p>
              <a href="/admin/inventory" className="btn-primary">Browse Inventory</a>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
