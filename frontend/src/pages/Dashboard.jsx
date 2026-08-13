import React, { useEffect, useState } from 'react';
import { Sparkles, Calendar, CheckCircle2, Clock, Image as ImageIcon, Lightbulb, TrendingUp, RefreshCw, Loader2 } from 'lucide-react';
import { postsApi } from '../api/postsApi';
import { menuApi } from '../api/menuApi';
import { useAuthStore } from '../store/authStore';

export default function Dashboard({ onStartCreate }) {
  const [posts, setPosts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  const loadDashboardData = async () => {
    try {
      const [postsRes, recsRes, menuRes] = await Promise.all([
        postsApi.listPosts().catch(() => []),
        menuApi.getRecommendations().catch(() => []),
        menuApi.getActiveMenu().catch(() => null),
      ]);
      setPosts(postsRes || []);
      setRecommendations(recsRes || []);
      setActiveMenu(menuRes);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateStrategy = async () => {
    setIsGeneratingStrategy(true);
    try {
      await menuApi.generateStrategy();
      // Wait briefly for background task execution before refreshing recommendations
      setTimeout(async () => {
        const recsRes = await menuApi.getRecommendations().catch(() => []);
        setRecommendations(recsRes || []);
        setIsGeneratingStrategy(false);
      }, 1500);
    } catch (err) {
      setIsGeneratingStrategy(false);
      alert(err.response?.data?.detail || 'Failed to trigger strategy generation.');
    }
  };

  const scheduledCount = posts.filter((p) => p.status === 'SCHEDULED').length;
  const publishedCount = posts.filter((p) => p.status === 'PUBLISHED').length;

  return (
    <div className="space-y-8">
      {/* Recommendations Banner */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center space-x-2">
            <Lightbulb className="w-6 h-6 text-amber-500" />
            <span>AI Content Strategy Recommendations</span>
          </h3>
          {activeMenu && (
            <button
              onClick={handleGenerateStrategy}
              disabled={isGeneratingStrategy}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 transition flex items-center space-x-2 shadow"
            >
              {isGeneratingStrategy ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <RefreshCw className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isGeneratingStrategy ? 'Generating Strategy...' : 'Refresh Strategy'}</span>
            </button>
          )}
        </div>

        {isGeneratingStrategy ? (
          <div className="p-8 rounded-2xl bg-stone-900/60 border border-stone-800 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <h4 className="font-bold text-white text-base">Analyzing Menu & Post History</h4>
            <p className="text-xs text-stone-400 max-w-md mx-auto">
              Your menu is active. We're selecting the best items to promote based on your historical activity...
            </p>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((rec) => (
              <div key={rec.id} className="p-6 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-950 border border-amber-500/20 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-lg uppercase tracking-wider">
                      Promote Dish
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">{rec.menu_item?.name || 'Menu Dish'}</h4>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center space-x-2 text-sm text-stone-400">
                      <Clock className="w-4 h-4 text-stone-500" />
                      <span>{rec.reason_context}</span>
                    </div>
                    {rec.suggested_angle && (
                      <div className="flex items-start space-x-2 text-sm text-amber-400/90 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                        <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="italic">"{rec.suggested_angle}"</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onStartCreate(rec.menu_item_id, rec.id)}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex justify-center items-center space-x-2 transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create Post</span>
                </button>
              </div>
            ))}
          </div>
        ) : activeMenu ? (
          <div className="p-8 rounded-2xl bg-stone-900/60 border border-stone-800 text-center space-y-4">
            <Lightbulb className="w-8 h-8 text-amber-400 mx-auto" />
            <div>
              <h4 className="font-bold text-white text-base">No active recommendations right now</h4>
              <p className="text-xs text-stone-400 max-w-md mx-auto mt-1">
                Your menu is active. Your current posting history doesn't suggest a new item to promote right now.
              </p>
            </div>
            <button
              onClick={handleGenerateStrategy}
              disabled={isGeneratingStrategy}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition inline-flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Strategy Recommendations</span>
            </button>
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Turn Raw Photos into Instagram Posts ✨</h2>
              <p className="text-amber-100 text-sm max-w-xl">
                Upload quick phone photos of your food. Gemini AI enhances lighting, generates on-brand captions, and auto-posts to Instagram.
              </p>
            </div>
            <button
              onClick={() => onStartCreate()}
              className="px-6 py-3.5 bg-stone-900 hover:bg-black text-amber-400 font-bold rounded-2xl shadow-xl transition shrink-0 flex items-center space-x-2"
            >
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Create New Post</span>
            </button>
          </div>
        )}
      </div>


      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl glass-card flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-stone-400 font-medium">Scheduled Posts</p>
            <p className="text-2xl font-bold text-white">{scheduledCount}</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl glass-card flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-stone-400 font-medium">Published Posts</p>
            <p className="text-2xl font-bold text-white">{publishedCount}</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl glass-card flex items-center space-x-4">
          <div className="p-3 bg-stone-800 text-stone-300 rounded-xl">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-stone-400 font-medium">Total AI Enhanced</p>
            <p className="text-2xl font-bold text-white">{posts.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
