import React, { useEffect, useState } from 'react';
import { Sparkles, Calendar, CheckCircle2, Clock, Image as ImageIcon } from 'lucide-react';
import { postsApi } from '../api/postsApi';
import { useAuthStore } from '../store/authStore';

export default function Dashboard({ onStartCreate }) {
  const [posts, setPosts] = useState([]);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      postsApi.listPosts().then((res) => setPosts(res || [])).catch(() => setPosts([]));
    }
  }, [isAuthenticated]);

  const scheduledCount = posts.filter((p) => p.status === 'SCHEDULED').length;
  const publishedCount = posts.filter((p) => p.status === 'PUBLISHED').length;

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Turn Raw Photos into Instagram Posts ✨</h2>
          <p className="text-amber-100 text-sm max-w-xl">
            Upload quick phone photos of your food. Gemini AI enhances lighting, generates on-brand captions, and auto-posts to Instagram.
          </p>
        </div>
        <button
          onClick={onStartCreate}
          className="px-6 py-3.5 bg-stone-900 hover:bg-black text-amber-400 font-bold rounded-2xl shadow-xl transition shrink-0 flex items-center space-x-2"
        >
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>Create New Post</span>
        </button>
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
