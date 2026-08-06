import React, { useState } from 'react';
import { Coffee, Sparkles, Lock, Mail, User, Building } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function AuthModal() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');

  const { login, signup, loginAsDemo, isLoading, error } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSignup) {
      await signup(email, password, fullName, businessName);
    } else {
      await login(email, password);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md p-8 rounded-3xl glass-card border border-stone-800 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Coffee className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">AI Social Media Manager</h2>
          <p className="text-xs text-stone-400">
            {isSignup ? 'Create tenant account for your bakery/cafe' : 'Sign in to manage your AI Instagram posts'}
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Maria Garcia"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Business Name</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Sweet Treats Bakery"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="owner@bakery.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-stone-800 w-full" />
          <span className="bg-stone-900 px-3 text-xs text-stone-500 font-medium absolute">OR</span>
        </div>

        {/* Quick Demo Login Button */}
        <button
          onClick={loginAsDemo}
          disabled={isLoading}
          className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-amber-400 font-bold rounded-xl border border-stone-700 transition flex items-center justify-center space-x-2"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Quick 1-Click Demo Login</span>
        </button>

        <div className="text-center">
          <button
            onClick={() => setIsSignup(!isSignup)}
            className="text-xs text-stone-400 hover:text-amber-400 font-medium transition"
          >
            {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}
