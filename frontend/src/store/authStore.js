import { create } from 'zustand';
import client from '../api/client';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('access_token') || null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,
  error: null,

  setToken: (token) => {
    localStorage.setItem('access_token', token);
    set({ token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await client.post('/auth/login', { email, password });
      const { access_token, refresh_token } = res.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      set({ token: access_token, isAuthenticated: true, isLoading: false });
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
      const { access_token, refresh_token } = res.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      set({ token: access_token, isAuthenticated: true, isLoading: false });
      return true;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Registration failed';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  loginAsDemo: async () => {
    set({ isLoading: true, error: null });
    const demoEmail = 'owner@bakery.com';
    const demoPass = 'BakeryOwner123!';

    try {
      // Try login first
      const res = await client.post('/auth/login', { email: demoEmail, password: demoPass });
      const { access_token, refresh_token } = res.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      set({ token: access_token, isAuthenticated: true, isLoading: false });
      return true;
    } catch (err) {
      // If login fails, sign up demo user first
      try {
        await client.post('/auth/signup', {
          email: demoEmail,
          password: demoPass,
          full_name: 'Sweet Treats Bakery Owner',
          business_name: 'Sweet Treats Bakery',
          brand_voice: 'friendly',
        });
        const res = await client.post('/auth/login', { email: demoEmail, password: demoPass });
        const { access_token, refresh_token } = res.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        set({ token: access_token, isAuthenticated: true, isLoading: false });
        return true;
      } catch (signupErr) {
        set({ error: 'Demo login failed', isLoading: false });
        return false;
      }
    }
  },
}));
