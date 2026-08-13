import { create } from 'zustand';
import client from '../api/client';

// Base URL for building the browser-navigation OAuth connect URL.
// The JWT is NOT appended here — it is exchanged for an opaque init_token first.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const useTenantStore = create((set, get) => ({
  tenantProfile: null,
  isLoading: false,
  error: null,
  oauthMessage: null,

  fetchProfile: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ tenantProfile: null, isLoading: false });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const res = await client.get('/tenant/profile');
      set({ tenantProfile: res.data, isLoading: false });
      return res.data;
    } catch (err) {
      // Fallback: try /users/me
      try {
        const res2 = await client.get('/users/me');
        set({ tenantProfile: res2.data, isLoading: false });
        return res2.data;
      } catch (err2) {
        set({ error: 'Failed to load tenant profile', isLoading: false });
        return null;
      }
    }
  },

  updateProfile: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await client.put('/tenant/profile', payload);
      set({ tenantProfile: res.data, isLoading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update tenant profile';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  /**
   * Initiate the real Meta OAuth flow — two-step to keep the JWT out of URLs.
   *
   * Step 1 (API call — JWT travels in Authorization header only, never in URL):
   *   POST /tenant/instagram/initiate
   *   → receives a short-lived opaque init_token
   *
   * Step 2 (browser navigation — opaque token in URL, not the JWT):
   *   window.location.href = /tenant/instagram/connect?init=<init_token>
   *   → backend validates init_token, generates OAuth state, redirects to Meta
   *
   * After Meta authorization the backend callback redirects the browser back
   * to the SPA with ?oauth_success=1 or ?oauth_error=<message>.
   */
  connectInstagram: async () => {
    set({ isLoading: true, error: null });
    try {
      // Step 1: obtain an opaque, single-use init_token via authenticated API call.
      // The axios interceptor attaches the JWT in the Authorization header — it
      // never appears in the URL.
      const res = await client.post('/tenant/instagram/initiate');
      const initToken = res.data?.init_token;
      if (!initToken) {
        throw new Error('Server did not return an OAuth init token.');
      }

      // Step 2: navigate the browser to the connect endpoint using the opaque token.
      // init_token is opaque (not a JWT), single-use, and expires in 5 minutes.
      const connectUrl = `${API_BASE}/tenant/instagram/connect?init=${encodeURIComponent(initToken)}`;
      window.location.href = connectUrl;

    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to start Instagram connection.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  disconnectInstagram: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await client.delete('/tenant/instagram/disconnect');
      // Refresh profile after disconnect
      await get().fetchProfile();
      set({ isLoading: false });
      return res.data;
    } catch (err) {
      // Try POST fallback for compat
      try {
        await client.post('/tenant/instagram/disconnect');
        await get().fetchProfile();
        set({ isLoading: false });
      } catch {
        set({ error: 'Failed to disconnect Instagram', isLoading: false });
        throw err;
      }
    }
  },

  refreshInstagram: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await client.post('/tenant/instagram/refresh');
      set({ tenantProfile: res.data, isLoading: false });
      return res.data;
    } catch (err) {
      set({ isLoading: false });
      return null;
    }
  },

  setOAuthMessage: (msg) => set({ oauthMessage: msg }),
  clearOAuthMessage: () => set({ oauthMessage: null }),

  clearTenantState: () => {
    set({ tenantProfile: null, isLoading: false, error: null, oauthMessage: null });
  },
}));

