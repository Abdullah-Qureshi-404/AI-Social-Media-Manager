import React, { useState } from 'react';
import { Sun, Coffee, Moon, Sparkles, SlidersHorizontal, Edit3, Wind, Camera, Loader2, Check, ArrowRight } from 'lucide-react';
import { usePostFlowStore } from '../../store/postFlowStore';

export default function PresetSelector({ onTriggerEdit, editCount, isLoading = false, isEnhancing = false }) {
  const { selectedPreset, setSelectedPreset, customPrompt, setCustomPrompt, recommendedPreset, setStep } = usePostFlowStore();
  const [mode, setMode] = useState('preset'); // 'preset' | 'custom'

  const presets = [
    {
      id: 'golden_hour',
      name: 'Golden Hour Warmth',
      desc: 'Adds warm sunset lighting, soft shadows, honey tones, and a luxury cafe photography look.',
      icon: Sun,
    },
    {
      id: 'rustic_cafe',
      name: 'Rustic Cafe',
      desc: 'Emphasizes warm wood textures, cozy ambient coffee shop lighting, and artisanal cafe charm.',
      icon: Coffee,
    },
    {
      id: 'dark_moody',
      name: 'Dark & Moody',
      desc: 'Creates dramatic directional lighting, deep shadows, dark slate/marble backdrop, and high-end restaurant contrast.',
      icon: Moon,
    },
    {
      id: 'clean_minimalist',
      name: 'Clean Minimalist',
      desc: 'Applies bright marble surfaces, Scandinavian minimalist aesthetic, and crisp, clutter-free staging.',
      icon: Sparkles,
    },
    {
      id: 'bright_airy',
      name: 'Bright & Airy',
      desc: 'Delivers soft natural window lighting, pastel background tones, and a fresh, vibrant aesthetic.',
      icon: Wind,
    },
    {
      id: 'studio_commercial',
      name: 'Studio Commercial',
      desc: 'Adds studio flash lighting, sharp focus, vibrant product pop, and crisp commercial advertisement polish.',
      icon: Camera,
    },
  ];

  const remainingEdits = Math.max(0, 3 - (editCount || 0));
  const isBusy = isLoading || isEnhancing;
  const isDisabled = isBusy || remainingEdits === 0;

  const handleTabChange = (newMode) => {
    if (isDisabled) return;
    setMode(newMode);
    if (newMode === 'preset') {
      setCustomPrompt('');
    } else {
      setSelectedPreset('custom');
    }
  };

  const handleApply = () => {
    if (mode === 'preset') {
      onTriggerEdit(selectedPreset, '');
    } else {
      onTriggerEdit('custom', customPrompt);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white tracking-tight">Photo Enhancement Mode</h3>
        <span className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
          {remainingEdits}/3 Edits Remaining
        </span>
      </div>

      {/* Mode Toggle Tabs */}
      <div className="flex p-1 bg-[#0f0f0f] border border-white/10 rounded-xl">
        <button
          type="button"
          onClick={() => handleTabChange('preset')}
          disabled={isDisabled}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-2 ${
            mode === 'preset'
              ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Use Preset Style</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('custom')}
          disabled={isDisabled}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-2 ${
            mode === 'custom'
              ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Write My Own Instruction</span>
        </button>
      </div>

      {/* Mode 1: Preset Style Cards (6 Styles) */}
      {mode === 'preset' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {presets.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedPreset === preset.id;
            const isRecommended = recommendedPreset === preset.id;

            return (
              <div
                key={preset.id}
                onClick={() => !isDisabled && setSelectedPreset(preset.id)}
                className={`p-4 rounded-2xl transition-all duration-300 border relative ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 text-white ring-1 ring-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                    : isRecommended
                    ? 'bg-amber-500/5 border-amber-500/50 text-white shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                    : 'bg-[#1a1a1a]/80 border-white/[0.06] text-zinc-300 hover:border-amber-500/40'
                }`}
              >
                {/* Top-Right Badges */}
                <div className="absolute top-3 right-3 flex items-center space-x-1.5">
                  {isRecommended && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded-full flex items-center space-x-0.5 shadow-sm">
                      <span>✦ Recommended</span>
                    </span>
                  )}
                  {isSelected && (
                    <span className="px-2 py-0.5 bg-amber-500 text-zinc-950 text-[10px] font-bold rounded-full flex items-center space-x-1 shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>SELECTED</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 mb-2">
                  <div className={`p-2.5 rounded-xl transition ${isSelected ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20' : 'bg-zinc-800/80 text-amber-400 border border-white/5'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs text-white tracking-tight">{preset.name}</h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{preset.desc}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Mode 2: Custom Instruction Textarea */}
      {mode === 'custom' && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-zinc-300">
            Custom Edit Instruction
          </label>
          <textarea
            rows={4}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={`Describe how you want this photo enhanced...\ne.g. Make the background dark slate marble, spotlight on the food item, add warm ambient reflections`}
            disabled={isDisabled}
            className="w-full px-4 py-3 bg-[#0f0f0f] border border-white/10 rounded-xl text-white text-xs placeholder-zinc-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none disabled:opacity-50 resize-none leading-relaxed transition"
          />
        </div>
      )}

      <div className="space-y-2.5 pt-1">
        <button
          onClick={handleApply}
          disabled={isDisabled || (mode === 'custom' && !customPrompt.trim())}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 text-xs sm:text-sm"
        >
          {isBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>
            {isBusy
              ? 'Enhancement Processing...'
              : remainingEdits === 0
              ? 'Max Edit Limit Reached (3/3)'
              : mode === 'preset'
              ? 'Apply Selected Enhancement Style'
              : 'Apply Custom Enhancement Instruction'}
          </span>
        </button>

        {/* Skip Enhancement Option */}
        <button
          type="button"
          onClick={() => setStep(3)}
          className="w-full py-2.5 bg-transparent hover:bg-amber-500/5 text-amber-400 text-xs font-semibold rounded-xl border border-amber-500/30 hover:border-amber-500/60 transition flex items-center justify-center space-x-1.5"
        >
          <span>Skip &amp; Use Original Photo →</span>
        </button>
      </div>
    </div>
  );
}

