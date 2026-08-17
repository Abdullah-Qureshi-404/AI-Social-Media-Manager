import React, { useEffect } from 'react';
import { Coffee, Menu, User as UserIcon, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';

export default function Header({ onToggleSidebar }) {
  const { logout, user, isAuthenticated } = useAuthStore();
  const { tenantProfile, fetchProfile } = useTenantStore();

  useEffect(() => {
    if (isAuthenticated && !tenantProfile) {
      fetchProfile();
    }
  }, [isAuthenticated, tenantProfile, fetchProfile]);

  const restaurantName = tenantProfile?.restaurant_name || user?.business_name || 'My Restaurant';
  const ownerName = tenantProfile?.owner_name || user?.full_name || 'Owner';

  return (
    <header className="h-16 border-b border-white/5 bg-[#0f0f0f]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition md:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Logo Icon with Amber Glow */}
        <div className="relative group">
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 opacity-60 blur-md transition duration-300 group-hover:opacity-100"></div>
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 border border-amber-400/30">
            <Coffee className="w-5 h-5 text-white" />
          </div>
        </div>

        <div>
          <h1 className="font-semibold text-base sm:text-lg text-white leading-none tracking-tight">AI Social Media Manager</h1>
          <span className="text-xs text-amber-500 font-medium">{restaurantName}</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3 pl-4 border-l border-white/5">
          <div className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-zinc-300 overflow-hidden shadow-inner">
            {tenantProfile?.logo_url ? (
              <img src={tenantProfile.logo_url} alt="Restaurant Logo" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-4 h-4 text-zinc-400" />
            )}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-zinc-200">{restaurantName}</p>
            <p className="text-xs text-zinc-400">{ownerName} (Owner)</p>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-2 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition ml-2"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
