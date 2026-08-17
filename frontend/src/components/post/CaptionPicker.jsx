import React, { useState, useEffect } from 'react';
import { Sparkles, Hash, Check, MessageSquare, RefreshCw, ArrowRight, SkipForward } from 'lucide-react';
import { usePostFlowStore } from '../../store/postFlowStore';

export default function CaptionPicker({ onGenerateCaptions, onNextStep, isGenerating = false }) {
  const {
    captionInstruction,
    setCaptionInstruction,
    captionTries,
    selectedCaption,
    setSelectedCaption,
    selectedHashtags,
    setSelectedHashtags,
    captionSkipped,
    setCaptionSkipped,
    hashtagsSkipped,
    setHashtagsSkipped,
    recommendedCaptionId,
    setRecommendations,
  } = usePostFlowStore();

  const [selectedIdx, setSelectedIdx] = useState(null);

  const defaultOptions = [
    {
      id: 1,
      tone: 'Professional',
      desc: 'Creates a polished business caption suitable for brands.',
      text: 'Artisanal daily specials handcrafted with premium ingredients. Visit us today for an uncompromised food experience.',
    },
    {
      id: 2,
      tone: 'Friendly',
      desc: 'Creates a warm conversational caption.',
      text: 'Fresh out of the kitchen! 🥐 Treat yourself to warm, delicious bites and your favorite coffee today! ☕✨',
    },
    {
      id: 3,
      tone: 'Promotional',
      desc: 'Highlights offers and encourages customers to visit.',
      text: 'Limited time daily special! Order now and get a complimentary specialty espresso with any pastry order. Tag a friend! 👇',
    },
    {
      id: 4,
      tone: 'Storytelling',
      desc: 'Creates an emotional story around the product.',
      text: 'From early morning preparations to the golden final bake. Taste the dedication behind every recipe we create.',
    },
  ];

  const defaultHashtags = [
    '#foodie', '#foodphotography', '#instafood', '#foodlover', 
    '#delicious', '#freshfood', '#cafelife', '#foodstagram', '#tasty'
  ];

  const [options, setOptions] = useState(defaultOptions);
  const [hashtags, setHashtags] = useState(defaultHashtags);

  useEffect(() => {
    if (!selectedHashtags || selectedHashtags.length === 0) {
      if (!hashtagsSkipped) {
        setSelectedHashtags(defaultHashtags);
      }
    }
  }, []);

  const remainingTries = Math.max(0, 3 - captionTries);
  const isLimitReached = captionTries >= 3;

  const handleGenerate = async () => {
    if (isLimitReached || isGenerating) return;
    // Clear any previous recommendations when new generation request starts
    setRecommendations(null, null);
    setSelectedIdx(null);
    setSelectedCaption('');
    
    const res = await onGenerateCaptions(captionInstruction);
    if (res && res.captions && res.captions.length > 0) {
      setOptions(res.captions);
      const returnedTags = res.suggested_hashtags || res.hashtags || defaultHashtags;
      setHashtags(returnedTags);
      setSelectedHashtags(returnedTags);
      setHashtagsSkipped(false);
      
      // Store recommendation metadata without auto-selecting
      if (res.recommended_caption_id || res.recommended_preset) {
        setRecommendations(res.recommended_preset || null, res.recommended_caption_id || null);
      }
    }
  };

  const handleSelectOption = (idx, text) => {
    setSelectedIdx(idx);
    setSelectedCaption(text);
    setCaptionSkipped(false);
  };

  const handleSkipCaption = () => {
    setSelectedIdx(null);
    setSelectedCaption('');
    setCaptionSkipped(true);
  };

  const handleSkipHashtags = () => {
    setSelectedHashtags([]);
    setHashtagsSkipped(true);
  };

  const toggleHashtag = (tag) => {
    setHashtagsSkipped(false);
    let updated;
    if (selectedHashtags.includes(tag)) {
      updated = selectedHashtags.filter((t) => t !== tag);
    } else {
      updated = [...selectedHashtags, tag];
    }
    setSelectedHashtags(updated);
  };

  const canAdvance = Boolean(selectedCaption || captionSkipped);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Caption Style & Hashtag Generator</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Generate image-aware captions and hashtags for your food photo</p>
        </div>
        <span className="text-xs font-bold px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
          Tries Left: {remainingTries}/3
        </span>
      </div>

      {/* STEP A — User optional caption direction input */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span>Caption Direction / Custom Prompt (optional)</span>
        </label>
        <input
          type="text"
          value={captionInstruction}
          onChange={(e) => setCaptionInstruction(e.target.value)}
          placeholder="e.g. friendly tone, mention weekend brunch discount, short with emojis"
          disabled={isLimitReached || isGenerating}
          className="w-full px-4 py-3 bg-[#0f0f0f] border border-white/10 rounded-xl text-white text-xs placeholder-zinc-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none disabled:opacity-50 transition"
        />
        <p className="text-[11px] text-zinc-400">Leave blank to generate suggested captions.</p>
      </div>

      {/* STEP B — Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isLimitReached || isGenerating}
        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
      >
        {isGenerating ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        <span>
          {isGenerating
            ? 'Generating Captions...'
            : isLimitReached
            ? 'Max Tries Reached (3/3)'
            : `Generate Captions (${remainingTries}/3 tries left)`}
        </span>
      </button>

      {/* STEP C — Selectable Caption Cards & Skip Button */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Select One Caption Style Below:
          </h4>
          <button
            type="button"
            onClick={handleSkipCaption}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition flex items-center space-x-1 ${
              captionSkipped
                ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-white'
            }`}
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>{captionSkipped ? 'Caption Skipped' : 'Skip Caption'}</span>
          </button>
        </div>

        {options.map((opt, idx) => {
          const isSelected = selectedIdx === idx && !captionSkipped;
          const optionId = opt.id !== undefined && opt.id !== null ? opt.id : idx + 1;
          const isRecommended =
            recommendedCaptionId !== null &&
            recommendedCaptionId !== undefined &&
            recommendedCaptionId === optionId;

          return (
            <div
              key={idx}
              onClick={() => handleSelectOption(idx, opt.text)}
              className={`p-4 rounded-xl cursor-pointer border transition-all duration-200 ${
                isSelected
                  ? 'border-l-4 border-amber-500 bg-amber-500/10 text-white shadow-[0_0_20px_rgba(245,158,11,0.15)] border-white/10'
                  : isRecommended
                  ? 'bg-amber-500/5 border-amber-500/40 text-zinc-200 hover:border-amber-500/60'
                  : 'bg-[#1a1a1a]/80 border-white/[0.06] text-zinc-300 hover:border-amber-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {opt.tone || opt.style || `Option ${idx + 1}`}
                </span>
                <div className="flex items-center space-x-2">
                  {isRecommended && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded-full shadow-sm">
                      ✦ Recommended
                    </span>
                  )}
                  {isSelected && (
                    <div className="flex items-center space-x-1 text-xs text-amber-400 font-bold">
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Selected</span>
                    </div>
                  )}
                </div>
              </div>
              {opt.desc && <p className="text-[11px] text-zinc-400 mb-2">{opt.desc}</p>}
              <p className="text-sm font-normal text-zinc-100 leading-relaxed">{opt.text}</p>
            </div>
          );
        })}
      </div>


      {/* STEP D — Hashtag Selection & Skip Button */}
      <div className="pt-2 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center space-x-1">
            <Hash className="w-4 h-4 text-amber-400" />
            <span>Select hashtags to include:</span>
          </h4>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSkipHashtags}
              className={`text-xs font-semibold px-2 py-0.5 rounded border transition flex items-center space-x-1 ${
                hashtagsSkipped
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                  : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-white'
              }`}
            >
              <span>{hashtagsSkipped ? 'Hashtags Skipped' : 'Skip Hashtags'}</span>
            </button>
            <span className="text-[11px] text-zinc-400">
              {selectedHashtags.length}/{hashtags.length} Selected
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {hashtags.map((tag, i) => {
            const isTagSelected = selectedHashtags.includes(tag);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleHashtag(tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                  isTagSelected
                    ? 'bg-amber-500 text-zinc-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-transparent border-amber-500/40 text-amber-300 hover:border-amber-500'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP E — Next button */}
      <div className="pt-4 border-t border-white/5">
        <button
          onClick={onNextStep}
          disabled={!canAdvance}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-zinc-950 font-bold rounded-xl shadow-lg shadow-amber-500/15 transition flex items-center justify-center space-x-2 text-xs sm:text-sm"
        >
          <span>Next: Text & Logo Overlay (Optional)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
