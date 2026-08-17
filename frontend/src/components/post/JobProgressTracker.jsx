import React from 'react';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export default function JobProgressTracker({ progress }) {
  if (!progress) return null;

  const isComplete = progress.progress_percent === 100;

  return (
    <div className="p-6 rounded-2xl bg-[#1a1a1a]/90 backdrop-blur-md border border-amber-500/30 bg-amber-500/5 my-6 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {isComplete ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          ) : (
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          )}
          <h3 className="font-bold text-white text-base">
            {isComplete ? 'Photo Enhancement Complete' : 'Enhancement Processing...'}
          </h3>
        </div>
        <span className="text-sm font-bold text-amber-400">{progress.progress_percent}%</span>
      </div>

      <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden mb-3 border border-white/5">
        <div
          className="bg-gradient-to-r from-amber-500 to-amber-400 h-2.5 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-500"
          style={{ width: `${progress.progress_percent}%` }}
        />
      </div>

      <p className="text-xs text-zinc-300 flex items-center space-x-2">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
        <span>{progress.message}</span>
      </p>
    </div>
  );
}
