import React from 'react';
import { PlusCircle, LayoutDashboard, History, Settings } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'create', label: 'Create Post', icon: PlusCircle },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'history', label: 'Post History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-stone-800 bg-stone-950/60 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)]">
      <div className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-stone-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800 text-xs text-stone-400">
        <p className="font-semibold text-stone-300 mb-1">Tenant Status</p>
        <p>Free Edits: <span className="text-amber-400 font-bold">3/3 Remaining</span></p>
        <p className="mt-1 text-emerald-400 font-medium">● Instagram Connected</p>
      </div>
    </aside>
  );
}
