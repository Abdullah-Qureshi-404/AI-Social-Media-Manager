import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, Clock, Lightbulb, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { postsApi } from '../api/postsApi';
import { menuApi } from '../api/menuApi';
import { useAuthStore } from '../store/authStore';

export default function Dashboard({ onStartCreate, onViewHistory }) {
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
    setRecommendations([]); // Clear/reset existing strategy cards first to avoid duplication
    try {
      await menuApi.generateStrategy();
      // Wait briefly for background task execution before replacing recommendations
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
    <div className="space-y-10 max-w-7xl mx-auto pb-8">
      {/* 1. Top Section - AI Content Strategy Recommendations */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-xl bg-amber-500/30 blur-md opacity-75 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative p-2.5 rounded-xl bg-[#1a1a1a] border border-amber-500/30 text-amber-400">
                <Lightbulb className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">AI Content Strategy Recommendations</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Smart posting suggestions tailored to your restaurant menu and activity.</p>
            </div>
          </div>

          {activeMenu && (
            <button
              onClick={handleGenerateStrategy}
              disabled={isGeneratingStrategy}
              className="px-4 py-2 bg-transparent hover:bg-white/[0.05] disabled:opacity-50 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl border border-white/10 transition flex items-center space-x-2 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isGeneratingStrategy ? 'animate-spin' : ''}`} />
              <span>{isGeneratingStrategy ? 'Generating Strategy...' : 'Refresh Strategy'}</span>
            </button>
          )}
        </div>

        {isGeneratingStrategy ? (
          <div className="p-10 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] text-center space-y-3 shadow-xl">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <h4 className="font-semibold text-white text-base">Analyzing Menu & Post History</h4>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Selecting the best dishes and promotional angles for your target audience...
            </p>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-6 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] hover:border-amber-500/40 hover:scale-[1.01] hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.2)] transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      PROMOTE DISH
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                    {rec.menu_item?.name || 'Menu Dish'}
                  </h2>

                  <div className="flex items-center space-x-2 text-xs text-zinc-400">
                    <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>{rec.reason_context || 'Never promoted recently'}</span>
                  </div>

                  {rec.suggested_angle && (
                    <div className="p-3 bg-amber-500/5 border-l-2 border-amber-500 rounded-r-xl text-xs text-amber-300/90 italic leading-relaxed">
                      &quot;{rec.suggested_angle}&quot;
                    </div>
                  )}
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => onStartCreate(rec.menu_item_id, rec.id)}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-semibold text-xs rounded-xl flex justify-center items-center space-x-2 shadow-lg shadow-amber-500/15 hover:scale-[1.02] transition-transform duration-200"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Create Post</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : activeMenu ? (
          <div className="p-8 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] text-center space-y-4 shadow-xl">
            <Lightbulb className="w-8 h-8 text-amber-400 mx-auto" />
            <div>
              <h4 className="font-semibold text-white text-base">No active recommendations right now</h4>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                Your menu is active. Click Refresh Strategy to generate new AI recommendations.
              </p>
            </div>
            <button
              onClick={handleGenerateStrategy}
              disabled={isGeneratingStrategy}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold text-xs rounded-xl shadow-lg shadow-amber-500/15 transition inline-flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Strategy Recommendations</span>
            </button>
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-gradient-to-r from-amber-600/90 via-amber-600 to-amber-700 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-amber-500/30">
            <div>
              <h2 className="text-2xl font-bold mb-2 tracking-tight">Turn Raw Photos into Instagram Posts ✨</h2>
              <p className="text-amber-100/90 text-xs sm:text-sm max-w-xl leading-relaxed">
                Upload quick phone photos of your food. Gemini AI enhances lighting, generates on-brand captions, and auto-posts to Instagram.
              </p>
            </div>
            <button
              onClick={() => onStartCreate()}
              className="px-6 py-3.5 bg-zinc-950 hover:bg-black text-amber-400 font-semibold text-xs sm:text-sm rounded-2xl shadow-xl transition shrink-0 flex items-center space-x-2 border border-amber-500/30"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Create New Post</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Bottom Stats Row - 3 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Scheduled Posts */}
        <div className="p-6 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] border-t-2 border-t-amber-500 hover:border-amber-500/30 hover:shadow-[0_0_20px_-5px_rgba(245,158,11,0.15)] transition-all duration-300 flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{scheduledCount}</p>
            <p className="text-xs font-semibold text-zinc-300">Scheduled Posts</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Posts in queue</p>
          </div>
        </div>

        {/* Published Posts */}
        <div className="p-6 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] border-t-2 border-t-emerald-500 hover:border-emerald-500/30 hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.15)] transition-all duration-300 flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{publishedCount}</p>
            <p className="text-xs font-semibold text-zinc-300">Published Posts</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Successfully posted</p>
          </div>
        </div>

        {/* Total AI Enhanced */}
        <div className="p-6 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] border-t-2 border-t-sky-500 hover:border-sky-500/30 hover:shadow-[0_0_20px_-5px_rgba(56,189,248,0.15)] transition-all duration-300 flex items-center space-x-4">
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{posts.length}</p>
            <p className="text-xs font-semibold text-zinc-300">Total AI Enhanced</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Images processed</p>
          </div>
        </div>
      </div>

      {/* 3. 4th Section Below Stats - Recent Posts Mini Preview */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Recent Posts</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Your latest post activity and scheduled items.</p>
          </div>
          {onViewHistory && (
            <button
              onClick={onViewHistory}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center space-x-1 transition"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] text-center text-xs text-zinc-400">
            No recent posts found. Create your first post above!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {posts.slice(0, 3).map((post) => {
              const imageUrl =
                post.permanent_image_url || post.current_edited_image_url || post.temp_image_url || post.original_image_url;
              return (
                <div
                  key={post.id}
                  onClick={onViewHistory}
                  className="p-3.5 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] hover:border-amber-500/30 transition-all duration-200 cursor-pointer space-y-3 group"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/5 relative">
                    <img
                      src={imageUrl}
                      alt="Post thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                        post.status === 'PUBLISHED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : post.status === 'SCHEDULED'
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : post.status === 'FAILED'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {post.status}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 line-clamp-1 leading-relaxed">
                      {post.caption || <span className="italic text-zinc-400">No caption</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
