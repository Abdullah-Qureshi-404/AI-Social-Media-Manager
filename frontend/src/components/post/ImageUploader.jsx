import React, { useState } from 'react';
import { UploadCloud, Camera } from 'lucide-react';
import { postsApi } from '../../api/postsApi';
import { usePostFlowStore } from '../../store/postFlowStore';

export default function ImageUploader({ context }) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setCurrentPost, setStep } = usePostFlowStore();

  const handleUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const post = await postsApi.uploadPhoto(file, context?.menuItemId, context?.recommendationId);
      setCurrentPost(post);
      setStep(2); // Proceed to AI Edit step
    } catch (err) {
      alert('Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-10 rounded-3xl bg-[#1a1a1a]/90 backdrop-blur-md text-center border-2 border-dashed border-white/10 hover:border-amber-500/60 transition-all duration-300 shadow-2xl group">
      <div className="relative mx-auto mb-5 w-20 h-20 group">
        <div className="absolute -inset-1 rounded-2xl bg-amber-500/30 blur-md opacity-70 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
        <div className="relative w-20 h-20 rounded-2xl bg-[#0f0f0f] border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl">
          <UploadCloud className="w-10 h-10" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Upload Raw Phone Photo</h2>
      <p className="text-xs sm:text-sm text-zinc-400 mb-8 leading-relaxed max-w-md mx-auto">
        Drag & drop any food or pastry photo from your phone. Our AI will fix lighting, clean backgrounds, and style it automatically.
      </p>

      <label className="inline-flex items-center space-x-2.5 px-7 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] text-zinc-950 font-bold rounded-xl text-xs sm:text-sm cursor-pointer shadow-lg shadow-amber-500/15 transition-all duration-300">
        <Camera className="w-4 h-4" />
        <span>{loading ? 'Compressing & Uploading...' : 'Select Photo from Phone'}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={loading}
          onChange={(e) => handleUpload(e.target.files[0])}
        />
      </label>

      <div className="mt-8 flex items-center justify-center space-x-4 text-xs text-zinc-400 font-medium">
        <span>JPG, PNG, WEBP up to 15MB</span>
        <span>•</span>
        <span>Auto-downscaled to 1080x1080</span>
      </div>
    </div>
  );
}
