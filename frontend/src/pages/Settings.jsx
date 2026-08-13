import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Instagram, Sliders, Store, User, RefreshCw, Unlink, ShieldCheck, CheckCircle2, Loader2, HardDrive, Sparkles, AlertTriangle, ExternalLink } from 'lucide-react';
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
      alert('Tenant profile updated successfully!');
    } catch (err) {
      alert('Failed to update settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectIg = async () => {
    setIsConnecting(true);
    try {
      // connectInstagram() calls POST /initiate (JWT in header) then navigates browser.
      // If the API call fails before navigation, show an error banner.
      await connectInstagram();
      // Note: if navigation succeeds the page will redirect — code below won't run.
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
  const quota = tenantProfile?.quota || { free_edits_remaining: 3, max_edits_allowed: 3, storage_usage: '1.2 GB / 5.0 GB' };

  // Format token expiry
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
        <div className={`flex items-start justify-between gap-3 p-4 rounded-2xl border text-sm font-medium ${
          oauthBanner.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-center gap-2">
            {oauthBanner.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{oauthBanner.msg}</span>
          </div>
          <button onClick={() => setOauthBanner(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-stone-800 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center space-x-2.5">
            <SettingsIcon className="w-7 h-7 text-amber-400" />
            <span>Tenant Settings & Meta Integration</span>
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Manage your restaurant identity, brand voice, and connected Instagram Business accounts.
          </p>
        </div>
        <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-full">
          {tenantProfile?.plan || 'Pro SaaS'}
        </span>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Restaurant Identity Card */}
        <div className="p-6 rounded-2xl glass-card border border-stone-800 space-y-4">
          <h3 className="font-bold text-stone-200 text-sm flex items-center space-x-2">
            <Store className="w-4 h-4 text-amber-400" />
            <span>Restaurant Identity</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-300">Restaurant / Business Name</label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="e.g. Musafor Cafe"
                className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-300">Owner Full Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Abdullah Qureshi"
                className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Brand Voice Card */}
        <div className="p-6 rounded-2xl glass-card border border-stone-800 space-y-4">
          <h3 className="font-bold text-stone-200 text-sm flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Brand Voice Preference</span>
          </h3>
          <p className="text-xs text-stone-400">
            Select the tone for AI generated captions and social media copy.
          </p>

          <select
            value={brandVoice}
            onChange={(e) => setBrandVoice(e.target.value)}
            className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white text-sm font-medium focus:border-amber-500 focus:outline-none"
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
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold rounded-xl text-xs transition flex items-center space-x-2 shadow-lg"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Meta Instagram Business Connection Suite */}
      <div className="p-6 rounded-2xl glass-card border border-stone-800 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-stone-200 text-sm flex items-center space-x-2">
            <Instagram className="w-4 h-4 text-amber-400" />
            <span>Meta Instagram Business Connection</span>
          </h3>

          {ig.connected ? (
            <span className="text-[11px] font-bold px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Connected</span>
            </span>
          ) : (
            <span className="text-[11px] font-bold px-3 py-1 bg-stone-800 text-stone-400 border border-stone-700 rounded-full">
              Not Connected
            </span>
          )}
        </div>

        {ig.connected ? (
          /* Meta Business Suite Connected Card */
          <div className="space-y-6 bg-stone-900/80 p-5 rounded-2xl border border-stone-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div className="flex items-center space-x-4">
                <img
                  src={ig.profile_picture || 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=200&q=80'}
                  alt="Instagram Profile"
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/40 shadow-lg"
                />
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-base text-white">{ig.business_name || tenantProfile?.restaurant_name}</span>
                    <ShieldCheck className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                  </div>
                  <span className="text-xs text-amber-400 font-medium block">@{ig.username || 'musafor_cafe'}</span>
                  <span className="text-[11px] text-stone-400 block mt-0.5">{ig.category || 'Food & Beverage / Restaurant'}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleRefreshIg}
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl transition flex items-center space-x-1 border border-stone-700"
                  title="Refresh Metrics"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={handleDisconnectIg}
                  className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold rounded-xl transition flex items-center space-x-1"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800">
                <span className="text-xs text-stone-400 block font-medium">Followers</span>
                <span className="text-lg font-bold text-white">{ig.followers || 0}</span>
              </div>
              <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800">
                <span className="text-xs text-stone-400 block font-medium">Following</span>
                <span className="text-lg font-bold text-white">{ig.following || 0}</span>
              </div>
              <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800">
                <span className="text-xs text-stone-400 block font-medium">Total Posts</span>
                <span className="text-lg font-bold text-white">{ig.posts || 0}</span>
              </div>
            </div>

            {/* Meta Token Status */}
            <div className="text-xs text-stone-400 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-stone-800/60 font-mono text-[11px]">
              <div>
                Connected At:{' '}
                <span className="text-stone-300">
                  {ig.connected_at ? new Date(ig.connected_at).toLocaleDateString() : 'Active'}
                </span>
              </div>
              <div>
                Token Status:{' '}
                <span className={ig.expires_at && new Date(ig.expires_at) <= new Date() ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                  {formatExpiry(ig.expires_at)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Meta Business Suite Disconnected Card */
          <div className="p-6 bg-stone-900/60 rounded-2xl border border-stone-800 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Instagram className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Instagram Business Account Not Connected</h4>
              <p className="text-xs text-stone-400 max-w-md mx-auto mt-1">
                Connect your Meta Instagram Business account to publish, schedule, and track engagement directly from your dashboard.
              </p>
            </div>
            <button
              onClick={handleConnectIg}
              disabled={isConnecting}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-extrabold text-xs rounded-xl shadow-lg transition inline-flex items-center space-x-2 disabled:opacity-50"
            >
              {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Instagram className="w-4 h-4" />}
              <span>{isConnecting ? 'Connecting Meta Account...' : 'Connect Instagram Business Account'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Tenant Quota & Usage */}
      <div className="p-6 rounded-2xl glass-card border border-stone-800 space-y-4">
        <h3 className="font-bold text-stone-200 text-sm flex items-center space-x-2">
          <HardDrive className="w-4 h-4 text-amber-400" />
          <span>Tenant Plan & Usage Quotas</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800">
            <span className="text-xs text-stone-400 block">Free Edits</span>
            <span className="text-base font-bold text-amber-400">
              {quota.free_edits_remaining}/{quota.max_edits_allowed}
            </span>
          </div>
          <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800">
            <span className="text-xs text-stone-400 block">AI Generations</span>
            <span className="text-base font-bold text-white">{quota.image_generations}</span>
          </div>
          <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800">
            <span className="text-xs text-stone-400 block">Posts Allowed</span>
            <span className="text-base font-bold text-white">{quota.posts_remaining}</span>
          </div>
          <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800">
            <span className="text-xs text-stone-400 block">Storage Usage</span>
            <span className="text-base font-bold text-stone-300 text-xs mt-1 block">{quota.storage_usage}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
