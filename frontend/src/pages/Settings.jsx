import React from 'react';
import { Settings as SettingsIcon, Instagram, Sliders } from 'lucide-react';

export default function Settings() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center space-x-2">
        <SettingsIcon className="w-6 h-6 text-amber-400" />
        <span>Brand Voice & Instagram Settings</span>
      </h2>

      <div className="p-6 rounded-2xl glass-card border border-stone-800 space-y-4">
        <h3 className="font-semibold text-stone-200 text-sm flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>Default Brand Voice</span>
        </h3>
        <select className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-white text-sm">
          <option value="friendly">Friendly & Warm (Bakery / Cafe Standard)</option>
          <option value="professional">Professional & Elegant</option>
          <option value="fun">Fun & Playful</option>
          <option value="minimal">Minimal & Clean</option>
        </select>
      </div>

      <div className="p-6 rounded-2xl glass-card border border-stone-800 space-y-4">
        <h3 className="font-semibold text-stone-200 text-sm flex items-center space-x-2">
          <Instagram className="w-4 h-4 text-amber-400" />
          <span>Meta Instagram Business Connection</span>
        </h3>
        <p className="text-xs text-stone-400">Connected Account: Sweet Treats Bakery (@sweettreats_demo)</p>
        <button className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold">
          ● Business Account Connected
        </button>
      </div>
    </div>
  );
}
