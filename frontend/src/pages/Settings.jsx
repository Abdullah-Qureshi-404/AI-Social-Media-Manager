import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Instagram, Sliders, Store, RefreshCw, Unlink, ShieldCheck, CheckCircle2, Loader2, Sparkles, AlertTriangle, HardDrive } from 'lucide-react';
import { useTenantStore } from '../store/tenantStore';

export default function Settings() {
  const { tenantProfile, updateProfile, connectInstagram, disconnectInstagram, refreshInstagram, isLoading, fetchProfile } = useTenantStore();

  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [brandVoice, setBrandVoice] = useState('friendly');
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [oauthBanner, setOauthBanner] = useState(null); // { type: 'success'|'error', msg: string }

  // Detect OAuth callback result from query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_success')) {
      setOauthBanner({ type: 'success', msg: 'Instagram Business Account connected successfully!' });
      // Refresh profile to show the real connected account
      fetchProfile();
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('oauth_error')) {
      const errMsg = params.get('oauth_error') || 'Connection failed. Please try again.';
      setOauthBanner({ type: 'error', msg: errMsg });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (tenantProfile) {
      setRestaurantName(tenantProfile.restaurant_name || '');
      setOwnerName(tenantProfile.owner_name || '');
      setBrandVoice(tenantProfile.brand_voice || 'friendly');
    }
  }, [tenantProfile]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        restaurant_name: restaurantName,
        owner_name: ownerName,
        brand_voice: brandVoice,
      });
      alert('Settings saved successfully!');
    } catch (err) {
      alert('Failed to update settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectIg = async () => {
    setIsConnecting(true);
    try {
      await connectInstagram();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to start Instagram connection.';
      setOauthBanner({ type: 'error', msg });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectIg = async () => {
    if (window.confirm('Are you sure you want to disconnect your Instagram Business account?')) {
      try {
        await disconnectInstagram();
      } catch (err) {
        alert('Failed to disconnect Instagram.');
      }
    }
  };

  const handleRefreshIg = async () => {
    try {
      await refreshInstagram();
    } catch (err) {
      // Ignore
    }
  };

  const ig = tenantProfile?.instagram || { connected: false };
  const quota = tenantProfile?.quota || {
    free_edits_used: 1,
    max_edits: 3,
    ai_generations_used: 14,
    max_generations: 50,
    posts_used: 8,
    max_posts: 30,
    storage_used_gb: 1.2,
    max_storage_gb: 5.0,
  };

  const formatExpiry = (expiresAt) => {
    if (!expiresAt) return 'Unknown';
    const d = new Date(expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return 'Expired';
    return `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* OAuth Result Banner */}
      {oauthBanner && (
        <div className={`flex items-start justify-between gap-3 p-4 rounded-2xl border text-xs font-semibold ${
          oauthBanner.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          <div className="flex items-center gap-2">
            {oauthBanner.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{oauthBanner.msg}</span>
          </div>
          <button onClick={() => setOauthBanner(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-xl bg-amber-500/30 blur-md opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative p-2.5 rounded-xl bg-[#1a1a1a] border border-amber-500/30 text-amber-400">
              <SettingsIcon className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Settings</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage your restaurant identity, brand voice, and connected Instagram Business accounts.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Restaurant Identity Card */}
        <div className="p-6 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] space-y-5 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Restaurant Identity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Restaurant / Business Name
              </label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="e.g. Musafor Cafe"
                className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-white/10 rounded-xl text-white text-xs placeholder-zinc-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Owner Full Name
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Abdullah Qureshi"
                className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-white/10 rounded-xl text-white text-xs placeholder-zinc-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                required
              />
            </div>
          </div>
        </div>

        {/* Brand Voice Card */}
        <div className="p-6 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] space-y-5 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Brand Voice Preference</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Select the tone for generated captions and social media copy.
              </p>
            </div>
          </div>

          <select
            value={brandVoice}
            onChange={(e) => setBrandVoice(e.target.value)}
            className="w-full px-4 py-3 bg-[#0f0f0f] border border-white/10 rounded-xl text-white text-xs font-medium focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
          >
            <option value="friendly">Friendly & Warm (Warm cafe standard)</option>
            <option value="luxury">Luxury & Fine Dining (Elegant, high-end)</option>
            <option value="modern">Modern & Sleek (Contemporary cafe / coffee shop)</option>
            <option value="elegant">Elegant & Sophisticated (Artisanal bakery)</option>
            <option value="casual">Casual & Approachable (Daily specials)</option>
            <option value="professional">Professional & Refined (Corporate catering)</option>
            <option value="custom">Custom Brand Voice</option>
          </select>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-xs transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-amber-500/15"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Meta Instagram Business Connection Suite */}
      <div className="p-6 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Instagram className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Meta Instagram Business Connection</h3>
          </div>

          {ig.connected ? (
            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)] text-[11px] font-bold px-3 py-1 rounded-full flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Connected</span>
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-3 py-1 bg-zinc-800 text-zinc-400 border border-white/5 rounded-full">
              Not Connected
            </span>
          )}
        </div>

        {ig.connected ? (
          /* Connected State Card */
          <div className="space-y-6 bg-[#0f0f0f]/80 p-5 rounded-2xl border border-white/5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center space-x-4">
                {ig.profile_picture ? (
                  <img
                    src={ig.profile_picture}
                    alt="Instagram Profile"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/40 shadow-lg"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold shadow-lg">
                    <Instagram className="w-7 h-7" />
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-base text-white">{ig.business_name || tenantProfile?.restaurant_name || 'Instagram Business'}</span>
                    <ShieldCheck className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                  </div>
                  {ig.username && (
                    <span className="text-xs text-amber-400 font-medium block">@{ig.username}</span>
                  )}
                  {ig.category && (
                    <span className="text-[11px] text-zinc-400 block mt-0.5">{ig.category}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleRefreshIg}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-sm"
                  title="Refresh Metrics"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={handleDisconnectIg}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center space-x-1.5"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>

            {/* Metrics Row (3 Mini Stat Cards) */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-[#1a1a1a]/60 rounded-xl border border-white/5">
                <span className="text-[11px] text-zinc-400 block font-semibold">Followers</span>
                <span className="text-lg font-bold text-white mt-0.5">{ig.followers || 0}</span>
              </div>
              <div className="p-3 bg-[#1a1a1a]/60 rounded-xl border border-white/5">
                <span className="text-[11px] text-zinc-400 block font-semibold">Following</span>
                <span className="text-lg font-bold text-white mt-0.5">{ig.following || 0}</span>
              </div>
              <div className="p-3 bg-[#1a1a1a]/60 rounded-xl border border-white/5">
                <span className="text-[11px] text-zinc-400 block font-semibold">Total Posts</span>
                <span className="text-lg font-bold text-white mt-0.5">{ig.posts || 0}</span>
              </div>
            </div>

            {/* Meta Token Status */}
            <div className="text-xs text-zinc-400 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-white/5 font-mono text-[11px]">
              <div>
                Connected At:{' '}
                <span className="text-zinc-300">
                  {ig.connected_at ? new Date(ig.connected_at).toLocaleDateString() : 'Active'}
                </span>
              </div>
              <button
                onClick={handleDisconnectMeta}
                disabled={isDisconnecting}
                className="px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-xs font-semibold transition"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-[#0f0f0f] border border-white/10 rounded-2xl text-center space-y-4">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center border border-amber-500/20">
              <Instagram className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">No Instagram Account Connected</h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Connect your Instagram Professional Account via Meta OAuth to enable direct publishing and automated scheduling.
              </p>
            </div>
            <button
              onClick={handleConnectMeta}
              disabled={isConnecting}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center space-x-2 mx-auto"
            >
              {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Instagram className="w-4 h-4" />}
              <span>{isConnecting ? 'Connecting...' : 'Connect Instagram Professional'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Quota & Usage Section (Amber Theme) */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] space-y-6 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Plan Quotas &amp; Usage</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Your monthly consumption and operational limits.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Quota Item 1: Photo Edits */}
          <div className="p-4 bg-[#0f0f0f]/80 rounded-xl border border-white/5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-zinc-300">Photo Enhancements</span>
              <span className="font-bold text-amber-400">
                {quota.free_edits_used}/{quota.max_edits}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.4)] transition-all duration-500"
                style={{ width: `${Math.min(100, ((quota.free_edits_used || 0) / (quota.max_edits || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Quota Item 2: Strategy Generations */}
          <div className="p-4 bg-[#0f0f0f]/80 rounded-xl border border-white/5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-zinc-300">Strategy Generations</span>
              <span className="font-bold text-amber-400">
                {quota.ai_generations_used}/{quota.max_generations}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.4)] transition-all duration-500"
                style={{ width: `${Math.min(100, ((quota.ai_generations_used || 0) / (quota.max_generations || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Quota Item 3: Posts Allowed */}
          <div className="p-4 bg-[#0f0f0f]/80 rounded-xl border border-white/5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-zinc-300">Posts Published / Scheduled</span>
              <span className="font-bold text-amber-400">
                {quota.posts_used}/{quota.max_posts}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.4)] transition-all duration-500"
                style={{ width: `${Math.min(100, ((quota.posts_used || 0) / (quota.max_posts || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Quota Item 4: Storage Usage */}
          <div className="p-4 bg-[#0f0f0f]/80 rounded-xl border border-white/5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-zinc-300">Media Storage Usage</span>
              <span className="font-bold text-amber-400">
                {quota.storage_used_gb} GB / {quota.max_storage_gb} GB
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.4)] transition-all duration-500"
                style={{ width: `${Math.min(100, ((quota.storage_used_gb || 0) / (quota.max_storage_gb || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
