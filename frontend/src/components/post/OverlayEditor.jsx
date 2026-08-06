import React, { useState } from 'react';
import { Type, ShieldCheck, Sparkles, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { usePostFlowStore } from '../../store/postFlowStore';
import { postsApi } from '../../api/postsApi';

export default function OverlayEditor({ onNextStep }) {
  const {
    currentPost,
    setCurrentPost,
    overlayText,
    setOverlayText,
    watermarkEnabled,
    setWatermarkEnabled,
    setOverlayDesign,
    setFabricCanvasJson,
  } = usePostFlowStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleApplyOverlay = async (force = false) => {
    if (!currentPost) return;
    const textToUse = overlayText.trim() || 'Daily Artisanal Special 🥐';

    setIsGenerating(true);
    try {
      const response = await postsApi.renderOverlay(currentPost.id, textToUse, watermarkEnabled, force);
      if (response && response.design) {
        setOverlayDesign(response.design);
        setFabricCanvasJson(null); // Reset manual edits when new design is generated
        if (response.post) setCurrentPost(response.post);
      }
      setShowConfirmModal(false);
      onNextStep(); // Automatically advance to Step 5 (Preview)
    } catch (err) {
      if (err.response?.status === 409) {
        // Safeguard 2: Manual edits exist — show confirmation dialog
        setShowConfirmModal(true);
      } else {
        alert('Failed to generate smart overlay. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Zero-Thinking Control Box */}
      <div className="p-6 rounded-2xl glass-card border border-stone-800 space-y-5 shadow-2xl">
        <div>
          <h3 className="text-xl font-extrabold text-white flex items-center space-x-2">
            <Type className="w-5 h-5 text-amber-400" />
            <span>Add Text to Your Post</span>
          </h3>
          <p className="text-xs text-stone-400 mt-1 leading-relaxed">
            Type your message below. Our system automatically chooses the best font, color, position, and background based on your photo.
          </p>
        </div>

        {/* Text Input Area */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-stone-300">
            Overlay Text on Photo
          </label>
          <textarea
            rows={3}
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            placeholder="Type what you want on your photo... e.g., Fresh Croissants • $4.99 • Available Daily 🥐"
            className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white text-sm placeholder-stone-500 focus:border-amber-500 focus:outline-none resize-none"
          />
        </div>

        {/* Brand Watermark Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-stone-900/60 rounded-xl border border-stone-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold text-stone-200 block flex items-center space-x-1.5">
                <span>Brand Logo Watermark</span>
                {watermarkEnabled && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Enabled</span>
                  </span>
                )}
              </span>
              <span className="text-xs text-stone-400 block">Include brand watermark badge on post image</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={watermarkEnabled}
            onChange={(e) => setWatermarkEnabled(e.target.checked)}
            className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
          />
        </div>

        {/* Apply Button */}
        <button
          onClick={() => handleApplyOverlay(false)}
          disabled={isGenerating}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-stone-950 font-extrabold rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          <span>{isGenerating ? 'Analyzing & Designing...' : 'Apply Smart Overlay ✨'}</span>
        </button>

        <p className="text-[11px] text-stone-500 text-center font-medium">
          Our system automatically chooses the best design based on your photo. Zero manual setup required.
        </p>
      </div>

      {/* Confirmation Modal for Safeguard 2 (Protect Manual Edits) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="font-bold text-lg text-white">Manual Edits Detected</h4>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Your current design has manual changes saved in the editor. Creating a new smart design will replace your manual edits. Continue?
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApplyOverlay(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl transition"
              >
                Generate New Design
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
