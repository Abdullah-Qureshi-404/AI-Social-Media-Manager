import React, { useState } from 'react';
import { Sun, Coffee, Moon, Sparkles, SlidersHorizontal, Edit3, Wind, Camera, Loader2 } from 'lucide-react';
import { usePostFlowStore } from '../../store/postFlowStore';

export default function PresetSelector({ onTriggerEdit, editCount, isLoading = false, isEnhancing = false }) {
  const { selectedPreset, setSelectedPreset, customPrompt, setCustomPrompt } = usePostFlowStore();
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
        <h3 className="text-lg font-bold text-white">Photo Enhancement Mode</h3>
        <span className="text-xs text-amber-400 font-medium bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
          {remainingEdits}/3 Edits Remaining
        </span>
      </div>

      {/* Mode Toggle Tabs */}
      <div className="flex p-1 bg-stone-900 border border-stone-800 rounded-xl">
        <button
          type="button"
          onClick={() => handleTabChange('preset')}
          disabled={isDisabled}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-2 ${
            mode === 'preset'
              ? 'bg-amber-500 text-stone-950 shadow'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Use Preset Style</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('custom')}
          disabled={isDisabled}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-2 ${
            mode === 'custom'
              ? 'bg-amber-500 text-stone-950 shadow'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Write My Own Instruction</span>
        </button>
      </div>

      {/* Mode 1: Preset Style Cards (6 Styles) */}
      {mode === 'preset' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {presets.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedPreset === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => !isDisabled && setSelectedPreset(preset.id)}
                className={`p-4 rounded-xl transition border ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 text-white ring-2 ring-amber-500/30'
                    : 'bg-stone-800/60 border-stone-700 text-stone-300 hover:border-stone-500'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-amber-500 text-stone-950' : 'bg-stone-700 text-stone-300'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-sm">{preset.name}</h4>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">{preset.desc}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Mode 2: Custom Instruction Textarea */}
      {mode === 'custom' && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-stone-300">
            Custom Edit Instruction
          </label>
          <textarea
            rows={4}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={`Describe how you want this photo enhanced...\ne.g. Make the background dark slate marble, spotlight on the food item, add warm ambient reflections`}
            disabled={isDisabled}
            className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white text-xs placeholder-stone-500 focus:border-amber-500 focus:outline-none disabled:opacity-50 resize-none leading-relaxed"
          />
        </div>
      )}

      <button
        onClick={handleApply}
        disabled={isDisabled || (mode === 'custom' && !customPrompt.trim())}
        className="w-full py-3.5 mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2 text-sm"
      >
        {isBusy ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Sparkles className="w-5 h-5" />
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
    </div>
  );
}
