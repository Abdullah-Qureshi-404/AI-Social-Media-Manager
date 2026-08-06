import React, { useState } from 'react';

export default function ComparisonSlider({ originalUrl, editedUrl }) {
  const [sliderPos, setSliderPos] = useState(50);

  const isEnhanced = Boolean(editedUrl && editedUrl !== originalUrl);

  if (!isEnhanced) {
    return (
      <div className="relative w-full aspect-square max-w-lg mx-auto rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 shadow-2xl select-none">
        <img
          src={originalUrl}
          alt="Original Uploaded Photo"
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-3 left-3 z-10 px-3 py-1 bg-black/70 backdrop-blur rounded-lg text-xs font-semibold text-white border border-white/10">
          Original Photo
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-square max-w-lg mx-auto rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 shadow-2xl select-none">
      {/* Right Side Background: Enhanced Photo */}
      <img
        src={editedUrl}
        alt="Enhanced Photo"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Left Side Overlay Container: Original Photo */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPos}%` }}
      >
        <img
          src={originalUrl}
          alt="Original Photo"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: '100%', height: '100%', minWidth: '100%' }}
        />
      </div>

      {/* Slider Divider Line */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-amber-400 cursor-ew-resize z-10"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xl ring-2 ring-stone-900">
          ↔
        </div>
      </div>

      {/* Range Input Control */}
      <input
        type="range"
        min="0"
        max="100"
        value={sliderPos}
        onChange={(e) => setSliderPos(Number(e.target.value))}
        className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-20"
      />

      {/* Labels: Left = Original, Right = Enhanced */}
      <div className="absolute bottom-3 left-3 z-10 px-3 py-1 bg-black/70 backdrop-blur rounded-lg text-xs font-semibold text-white border border-white/10">
        Original Photo
      </div>
      <div className="absolute bottom-3 right-3 z-10 px-3 py-1 bg-amber-500/90 backdrop-blur rounded-lg text-xs font-semibold text-white shadow-lg">
        Enhanced Photo ✨
      </div>
    </div>
  );
}
