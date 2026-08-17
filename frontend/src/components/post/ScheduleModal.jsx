import React, { useState } from 'react';
import { Calendar, Clock, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePostFlowStore } from '../../store/postFlowStore';

export default function ScheduleModal({ onSchedule, onPostNow }) {
  const { currentPost, selectedCaption, captionSkipped, selectedHashtags, hashtagsSkipped } = usePostFlowStore();
  const [scheduledAt, setScheduledAt] = useState('');

  const hasImage = Boolean(currentPost?.current_edited_image_url || currentPost?.temp_image_url || currentPost?.original_image_url);
  const captionDone = Boolean(selectedCaption || captionSkipped || currentPost?.caption);
  const hashtagDone = Boolean(selectedHashtags.length > 0 || hashtagsSkipped);

  const isPublishReady = hasImage && captionDone && hashtagDone;

  const handleScheduleClick = () => {
    if (!isPublishReady) {
      alert('Please complete caption and image selection before scheduling your post.');
      return;
    }
    onSchedule(scheduledAt);
  };

  const handlePostNowClick = () => {
    if (!isPublishReady) {
      alert('Please complete caption and image selection before publishing your post.');
      return;
    }
    onPostNow();
  };

  return (
    <div className="space-y-5 p-6 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Calendar className="w-4.5 h-4.5 text-amber-400" />
          <span>Schedule Instagram Post</span>
        </h3>
        {isPublishReady ? (
          <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready to Publish</span>
          </span>
        ) : (
          <span className="text-xs font-bold text-amber-400 flex items-center space-x-1 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Incomplete Steps</span>
          </span>
        )}
      </div>

      {!isPublishReady && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-semibold">
          ⚠️ Complete all required steps (photo, caption, hashtags) before publishing.
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-300">Pick Date & Time</label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full px-4 py-3 bg-[#0f0f0f] border border-white/10 rounded-xl text-white text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition accent-amber-500 font-medium"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <button
          onClick={handleScheduleClick}
          disabled={!scheduledAt || !isPublishReady}
          className="py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 text-zinc-950 font-bold rounded-xl shadow-lg shadow-amber-500/15 transition-all duration-300 flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
        >
          <Clock className="w-4 h-4" />
          <span>Schedule Post</span>
        </button>

        <button
          onClick={handlePostNowClick}
          disabled={!isPublishReady}
          className="py-3.5 bg-emerald-500 hover:bg-emerald-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 text-zinc-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-300 flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
        >
          <Send className="w-4 h-4" />
          <span>Post Now</span>
        </button>
      </div>
    </div>
  );
}
