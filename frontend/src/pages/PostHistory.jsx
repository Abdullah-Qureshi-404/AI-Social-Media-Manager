import React, { useEffect, useState } from 'react';
import { postsApi } from '../api/postsApi';
import { useAuthStore } from '../store/authStore';

export default function PostHistory() {
  const [posts, setPosts] = useState([]);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      postsApi.listPosts().then((res) => setPosts(res || [])).catch(() => setPosts([]));
    }
  }, [isAuthenticated]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Post History & Schedule</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <div key={post.id} className="p-4 rounded-2xl glass-card border border-stone-800 space-y-3">
            <img
              src={post.permanent_image_url || post.temp_image_url || post.original_image_url}
              alt="Post thumbnail"
              className="w-full aspect-square object-cover rounded-xl"
            />
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 font-bold text-xs rounded-lg uppercase">
                {post.status}
              </span>
              <span className="text-xs text-stone-400">{new Date(post.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-xs text-stone-300 line-clamp-2">{post.caption || 'No caption'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
