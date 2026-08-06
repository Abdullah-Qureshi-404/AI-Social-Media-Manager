import React, { useState } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import AuthModal from './components/auth/AuthModal';
import Dashboard from './pages/Dashboard';
import CreatePost from './pages/CreatePost';
import PostHistory from './pages/PostHistory';
import Settings from './pages/Settings';
import { useAuthStore } from './store/authStore';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && <Dashboard onStartCreate={() => setActiveTab('create')} />}
          {activeTab === 'create' && <CreatePost />}
          {activeTab === 'history' && <PostHistory />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}
