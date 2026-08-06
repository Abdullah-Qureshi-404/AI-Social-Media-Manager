import React from 'react';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export default function JobProgressTracker({ progress }) {
  if (!progress) return null;

  const isComplete = progress.progress_percent === 100;

  return (
    <div className="p-6 rounded-2xl glass-card border border-amber-500/30 bg-amber-500/5 my-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {isComplete ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          ) : (
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          )}
          <h3 className="font-semibold text-white text-base">
            {isComplete ? 'Photo Enhancement Complete' : 'Enhancement Processing...'}
          </h3>
        </div>
        <span className="text-sm font-bold text-amber-400">{progress.progress_percent}%</span>
      </div>

      <div className="w-full bg-stone-800 rounded-full h-2.5 overflow-hidden mb-3">
        <div
          className="bg-gradient-to-r from-amber-500 to-amber-400 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${progress.progress_percent}%` }}
        />
      </div>

      <p className="text-xs text-stone-300 flex items-center space-x-2">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
        <span>{progress.message}</span>
      </p>
    </div>
  );
}
