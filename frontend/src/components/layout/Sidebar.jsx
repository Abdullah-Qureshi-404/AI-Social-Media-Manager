import React from 'react';
import { PlusCircle, LayoutDashboard, Clock, Settings, UtensilsCrossed, X } from 'lucide-react';
import { useTenantStore } from '../../store/tenantStore';

export default function Sidebar({ activeTab, setActiveTab, mobileOpen = false, onClose }) {
  const { tenantProfile } = useTenantStore();

  const navItems = [
    { id: 'create', label: 'Create Post', icon: PlusCircle },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'menu', label: 'Menu Intelligence', icon: UtensilsCrossed },
    { id: 'history', label: 'Post History', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const isIgConnected = tenantProfile?.instagram?.connected || false;

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (onClose) onClose();
  };

  const content = (
    <div className="flex flex-col justify-between h-full">
      <div className="space-y-2">
        <div className="flex items-center justify-between md:hidden pb-3 mb-2 border-b border-white/5">
          <span className="font-semibold text-zinc-200 text-sm">Navigation</span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 font-semibold border-l-2 border-amber-500 shadow-[inset_4px_0_12px_-2px_rgba(245,158,11,0.2)] rounded-l-none'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] text-xs text-zinc-400 space-y-2 mt-auto">
        <p className="font-semibold text-zinc-300">Account Status</p>
        {isIgConnected ? (
          <div className="text-emerald-400 font-medium flex items-center space-x-2 pt-0.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-semibold">Instagram Connected</span>
          </div>
        ) : (
          <div className="text-zinc-400 font-medium flex items-center space-x-2 pt-0.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600 inline-block"></span>
            <span>Instagram Not Connected</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#0f0f0f]/90 backdrop-blur-md p-4 hidden md:flex flex-col justify-between min-h-[calc(100vh-4rem)] sticky top-16 h-[calc(100vh-4rem)]">
        {content}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          {/* Drawer */}
          <div className="relative w-64 max-w-[80vw] bg-[#0f0f0f] border-r border-white/5 p-4 flex flex-col h-full z-10 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
