import { create } from 'zustand';
import client from '../api/client';
import { useTenantStore } from './tenantStore';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('access_token') || null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,
  error: null,

  setToken: (token) => {
    localStorage.setItem('access_token', token);
    set({ token, isAuthenticated: true });
    useTenantStore.getState().fetchProfile();
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    useTenantStore.getState().clearTenantState();
    set({ user: null, token: null, isAuthenticated: false });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await client.post('/auth/login', { email, password });
      const { access_token, refresh_token, user } = res.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
      useTenantStore.getState().fetchProfile();
      return true;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Invalid login credentials';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  signup: async (email, password, fullName, businessName) => {
    set({ isLoading: true, error: null });
    try {
      await client.post('/auth/signup', {
        email,
        password,
        full_name: fullName,
        business_name: businessName,
        brand_voice: 'friendly',
      });
      // Auto login after signup
      const res = await client.post('/auth/login', { email, password });
      const { access_token, refresh_token, user } = res.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
      useTenantStore.getState().fetchProfile();
      return true;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Registration failed';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  loginAsDemo: async () => {
    set({ isLoading: true, error: null });
    const demoEmail = 'owner@restaurant.com';
    const demoPass = 'RestaurantOwner123!';

    try {
      // Try login first
      const res = await client.post('/auth/login', { email: demoEmail, password: demoPass });
      const { access_token, refresh_token, user } = res.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
      useTenantStore.getState().fetchProfile();
      return true;
    } catch (err) {
      // If login fails, sign up demo user first
      try {
        await client.post('/auth/signup', {
          email: demoEmail,
          password: demoPass,
          full_name: 'Musafor Owner',
          business_name: 'Musafor Cafe',
          brand_voice: 'friendly',
        });
        const res = await client.post('/auth/login', { email: demoEmail, password: demoPass });
        const { access_token, refresh_token, user } = res.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        set({ user, token: access_token, isAuthenticated: true, isLoading: false });
        useTenantStore.getState().fetchProfile();
        return true;
      } catch (signupErr) {
        set({ error: 'Demo login failed', isLoading: false });
        return false;
      }
    }
  },
}));
