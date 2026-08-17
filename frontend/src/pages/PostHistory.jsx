import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  X,
  Instagram,
  Eye,
  Loader2,
  Sparkles
} from 'lucide-react';
import { postsApi } from '../api/postsApi';
import { useAuthStore } from '../store/authStore';

export default function PostHistory() {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuthStore();

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const res = await postsApi.listPosts();
      setPosts(res || []);
    } catch {
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadPosts();
    }
  }, [isAuthenticated]);

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    setIsDeleting(true);
    try {
      await postsApi.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSelectedPost(null);
    } catch {
      alert('Failed to delete post.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)] text-[10px] font-bold rounded-full flex items-center space-x-1 backdrop-blur-md">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Published</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2.5 py-1 bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.25)] text-[10px] font-bold rounded-full flex items-center space-x-1 backdrop-blur-md">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Failed</span>
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="px-2.5 py-1 bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.25)] text-[10px] font-bold rounded-full flex items-center space-x-1 backdrop-blur-md">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>Scheduled</span>
          </span>
        );
      case 'POSTING':
        return (
          <span className="px-2.5 py-1 bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)] text-[10px] font-bold rounded-full flex items-center space-x-1 animate-pulse backdrop-blur-md">
            <Clock className="w-3 h-3 shrink-0" />
            <span>Posting...</span>
          </span>
        );
      case 'APPROVED':
      case 'IMAGE_READY':
        return (
          <span className="px-2.5 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)] text-[10px] font-bold rounded-full flex items-center space-x-1 backdrop-blur-md">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>Ready</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-zinc-900/80 text-zinc-300 border border-white/10 text-[10px] font-bold rounded-full backdrop-blur-md">
            {status}
          </span>
        );
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (filter === 'ALL') return true;
    if (filter === 'SCHEDULED') return post.status === 'SCHEDULED';
    if (filter === 'PUBLISHED') return post.status === 'PUBLISHED';
    if (filter === 'FAILED') return post.status === 'FAILED';
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-xl bg-amber-500/30 blur-md opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative p-2.5 rounded-xl bg-[#1a1a1a] border border-amber-500/30 text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-2xl font-bold text-white tracking-tight">Post History & Schedule</h2>
              <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-full">
                {posts.length} Posts
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              View, inspect, and manage your published and scheduled Instagram posts.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 bg-[#1a1a1a] p-1 rounded-xl border border-white/[0.06] self-start sm:self-auto">
          {['ALL', 'SCHEDULED', 'PUBLISHED', 'FAILED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === tab
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Grid (3 Columns) */}
      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
          <p className="text-xs text-zinc-400 mt-2">Loading posts...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] text-center space-y-2 shadow-xl">
          <p className="text-zinc-200 font-semibold text-sm">No posts found</p>
          <p className="text-xs text-zinc-400">
            {filter === 'ALL'
              ? 'You have not created any posts yet. Start by creating one!'
              : `No posts currently in "${filter}" status.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => {
            const imageUrl =
              post.permanent_image_url || post.current_edited_image_url || post.temp_image_url || post.original_image_url;
            return (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="p-4 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] hover:border-amber-500/40 hover:scale-[1.02] hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.2)] transition-all duration-300 cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Thumbnail Image Container */}
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/5 group-hover:border-amber-500/40 transition duration-300">
                    <img
                      src={imageUrl}
                      alt="Post thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />

                    {/* Status Badge Top-Left Overlay */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      {getStatusBadge(post.status)}
                    </div>

                    {/* Date Pill Top-Right Overlay */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-zinc-300 font-medium rounded-md shadow-sm">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Hover Button Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="px-4 py-2 bg-amber-500 text-zinc-950 font-bold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transform translate-y-2 group-hover:translate-y-0 transition duration-300">
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                      </span>
                    </div>
                  </div>

                  {/* Caption Preview (2 lines max) */}
                  <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed font-normal pt-1">
                    {post.caption || <span className="italic text-zinc-500">No caption generated</span>}
                  </p>
                </div>

                {post.status === 'FAILED' && post.error_message && (
                  <div className="mt-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 line-clamp-1">
                    {post.error_message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Post Details Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedPost(null)}
          />

          <div className="relative w-full max-w-2xl bg-[#1a1a1a] border border-white/[0.08] rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-bold text-white">Post Details</h3>
                {getStatusBadge(selectedPost.status)}
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Image */}
              <div className="aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/5">
                <img
                  src={
                    selectedPost.permanent_image_url ||
                    selectedPost.current_edited_image_url ||
                    selectedPost.temp_image_url ||
                    selectedPost.original_image_url
                  }
                  alt="Post"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Information Column */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block mb-1">
                      Caption
                    </label>
                    <div className="p-3 bg-[#0f0f0f]/80 rounded-xl border border-white/5 text-xs text-zinc-200 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                      {selectedPost.caption || <span className="italic text-zinc-500">No caption</span>}
                    </div>
                  </div>

                  {/* Metadata Table */}
                  <div className="space-y-1.5 text-xs text-zinc-400 pt-2 border-t border-white/5">
                    <div className="flex justify-between py-1 border-b border-white/[0.03]">
                      <span>Created</span>
                      <span className="text-zinc-200">
                        {new Date(selectedPost.created_at).toLocaleString()}
                      </span>
                    </div>

                    {selectedPost.scheduled_at && (
                      <div className="flex justify-between py-1 border-b border-white/[0.03]">
                        <span>Scheduled For</span>
                        <span className="text-sky-400 font-medium">
                          {new Date(selectedPost.scheduled_at).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {selectedPost.published_at && (
                      <div className="flex justify-between py-1 border-b border-white/[0.03]">
                        <span>Published At</span>
                        <span className="text-emerald-400 font-medium">
                          {new Date(selectedPost.published_at).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {selectedPost.instagram_media_id && (
                      <div className="flex justify-between py-1 border-b border-white/[0.03]">
                        <span>Instagram Media ID</span>
                        <span className="text-amber-400 font-mono text-[11px]">
                          {selectedPost.instagram_media_id}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Error Message Alert */}
                  {selectedPost.status === 'FAILED' && selectedPost.error_message && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 space-y-1">
                      <div className="flex items-center space-x-1.5 font-semibold">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Failure Details</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-rose-300">
                        {selectedPost.error_message}
                      </p>
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-white/5 space-y-2">
                  {selectedPost.status === 'PUBLISHED' && (
                    <p className="text-[11px] text-zinc-400 leading-tight">
                      To remove a published post from your Instagram feed, please delete it directly within the Instagram app.
                    </p>
                  )}

                  <button
                    onClick={() => handleDeletePost(selectedPost.id)}
                    disabled={isDeleting}
                    className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    <span>Delete Post</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
