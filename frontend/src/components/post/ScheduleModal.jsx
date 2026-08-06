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
    <div className="space-y-4 p-6 rounded-2xl glass-card border border-stone-800">
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-amber-400" />
          <span>Schedule Instagram Post</span>
        </h3>
        {isPublishReady ? (
          <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Ready to Publish</span>
          </span>
        ) : (
          <span className="text-xs font-semibold text-amber-400 flex items-center space-x-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Incomplete Steps</span>
          </span>
        )}
      </div>

      {!isPublishReady && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400">
          ⚠️ Complete all required steps (photo, caption, hashtags) before publishing.
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-stone-300 mb-1">Pick Date & Time</label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={handleScheduleClick}
          disabled={!scheduledAt || !isPublishReady}
          className="py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-stone-950 font-extrabold rounded-xl shadow-lg transition flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
        >
          <Clock className="w-4 h-4" />
          <span>Schedule Post</span>
        </button>

        <button
          onClick={handlePostNowClick}
          disabled={!isPublishReady}
          className="py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
        >
          <Send className="w-4 h-4" />
          <span>Post Now</span>
        </button>
      </div>
    </div>
  );
}
