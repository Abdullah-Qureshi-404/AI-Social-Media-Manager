import { create } from 'zustand';
import client from '../api/client';

export const useTenantStore = create((set, get) => ({
  tenantProfile: null,
  isLoading: false,
  error: null,

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

  connectInstagram: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await client.post('/tenant/instagram/connect');
      set({ tenantProfile: res.data, isLoading: false });
      return res.data;
    } catch (err) {
      set({ error: 'Failed to connect Instagram Business account', isLoading: false });
      throw err;
    }
  },

  disconnectInstagram: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await client.post('/tenant/instagram/disconnect');
      set({ tenantProfile: res.data, isLoading: false });
      return res.data;
    } catch (err) {
      set({ error: 'Failed to disconnect Instagram', isLoading: false });
      throw err;
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

  clearTenantState: () => {
    set({ tenantProfile: null, isLoading: false, error: null });
  },
}));
