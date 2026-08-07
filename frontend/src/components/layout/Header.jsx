import React, { useEffect } from 'react';
import { Coffee, Bell, User as UserIcon, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';

export default function Header() {
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
    <header className="h-16 border-b border-stone-800 bg-stone-900/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Coffee className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white leading-none">AI Social Media Manager</h1>
          <span className="text-xs text-amber-500 font-medium">{restaurantName}</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-3 pl-4 border-l border-stone-800">
          <div className="w-9 h-9 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 overflow-hidden">
            {tenantProfile?.logo_url ? (
              <img src={tenantProfile.logo_url} alt="Restaurant Logo" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-4 h-4" />
            )}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-stone-200">{restaurantName}</p>
            <p className="text-xs text-stone-400">{ownerName} (Owner)</p>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-2 text-stone-400 hover:text-rose-400 rounded-lg hover:bg-stone-800 transition ml-2"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
