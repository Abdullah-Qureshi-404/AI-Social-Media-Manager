import React from 'react';
import { X, Sparkles } from 'lucide-react';
import ImageEditor from './ImageEditor';

export default function EditModal({ isOpen, onClose, imageUrl, postId, onSave }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-stone-900/95 border border-stone-800 rounded-3xl p-5 shadow-2xl space-y-4 my-auto ring-1 ring-amber-500/20">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center space-x-2">
                <span>Interactive Studio Editor</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-800 text-amber-400 border border-stone-700">Studio</span>
              </h3>
              <p className="text-xs text-stone-400">
                Customize text, shapes, fonts, logo badge, and watermarks over your photo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition border border-stone-700 shadow-sm"
            title="Close Editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Embedded Canvas Editor */}
        <ImageEditor imageUrl={imageUrl} postId={postId} onSave={onSave} onBack={onClose} />
      </div>
    </div>
  );
}
