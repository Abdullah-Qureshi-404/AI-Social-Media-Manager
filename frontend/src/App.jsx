import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import AuthModal from './components/auth/AuthModal';
import Dashboard from './pages/Dashboard';
import CreatePost from './pages/CreatePost';
import PostHistory from './pages/PostHistory';
import Settings from './pages/Settings';
import MenuManager from './pages/MenuManager';
import { useAuthStore } from './store/authStore';
import { useTenantStore } from './store/tenantStore';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [createPostContext, setCreatePostContext] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const { fetchProfile } = useTenantStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
      const params = new URLSearchParams(window.location.search);
      if (params.has('oauth_success') || params.has('oauth_error')) {
        setActiveTab('settings');
      }
    }
  }, [isAuthenticated, fetchProfile]);

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-zinc-100 flex flex-col relative selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background Warm Amber Radial Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-amber-500/[0.04] rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[300px] bg-amber-600/[0.02] rounded-full blur-[120px] pointer-events-none z-0" />

      <Header onToggleSidebar={() => setMobileNavOpen((prev) => !prev)} />
      <div className="flex flex-1 relative z-10">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <Dashboard 
              onStartCreate={(menuItemId, recommendationId) => {
                setCreatePostContext({ menuItemId, recommendationId });
                setActiveTab('create');
              }} 
              onViewHistory={() => setActiveTab('history')}
            />
          )}
          {activeTab === 'menu' && <MenuManager />}
          {activeTab === 'create' && <CreatePost context={createPostContext} />}
          {activeTab === 'history' && <PostHistory />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}
