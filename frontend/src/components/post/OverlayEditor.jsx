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
        setFabricCanvasJson(null);
        if (response.post) setCurrentPost(response.post);
      }
      setShowConfirmModal(false);
      onNextStep();
    } catch (err) {
      if (err.response?.status === 409) {
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
      {/* Control Box Card */}
      <div className="p-6 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] space-y-5 shadow-2xl">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center space-x-2 tracking-tight">
            <Type className="w-5 h-5 text-amber-400" />
            <span>Add Text to Your Post</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Type your message below. Our system automatically chooses the best font, color, position, and background based on your photo.
          </p>
        </div>

        {/* Text Input Area */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-zinc-300">
            Overlay Text on Photo
          </label>
          <textarea
            rows={3}
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            placeholder="Type what you want on your photo... e.g., Fresh Croissants • $4.99 • Available Daily 🥐"
            className="w-full px-4 py-3 bg-[#0f0f0f] border border-white/10 rounded-xl text-white text-xs placeholder-zinc-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none transition"
          />
        </div>

        {/* Brand Watermark Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-[#0f0f0f]/80 rounded-xl border border-white/5">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-zinc-200 block flex items-center space-x-1.5">
                <span>Brand Logo Watermark</span>
                {watermarkEnabled && (
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Enabled</span>
                  </span>
                )}
              </span>
              <span className="text-[11px] text-zinc-400 block">Include brand watermark badge on post image</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={watermarkEnabled}
            onChange={(e) => setWatermarkEnabled(e.target.checked)}
            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setOverlayDesign(null);
              onNextStep();
            }}
            className="w-full sm:w-1/2 py-3 bg-transparent hover:bg-white/5 border border-white/10 text-zinc-300 font-semibold rounded-xl transition flex items-center justify-center space-x-2 text-xs"
          >
            <span>Skip / No Text Overlay ➔</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyOverlay(false)}
            disabled={isGenerating || !overlayText.trim()}
            className="w-full sm:w-1/2 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 text-zinc-950 font-bold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 text-xs"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{isGenerating ? 'Designing...' : 'Apply Smart Overlay ✨'}</span>
          </button>
        </div>

        <p className="text-[11px] text-zinc-400 text-center font-medium">
          Optional: Type text above to generate a smart layout, or click &quot;Skip&quot; to keep your clean photo.
        </p>
      </div>

      {/* Confirmation Modal for Safeguard 2 (Protect Manual Edits) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="font-semibold text-base text-white">Manual Edits Detected</h4>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Your current design has manual changes saved in the editor. Creating a new smart design will replace your manual edits. Continue?
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApplyOverlay(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-semibold rounded-xl transition"
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
