import React, { useState } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles } from 'lucide-react';
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
    <div className="max-w-2xl mx-auto p-8 rounded-2xl glass-card text-center border-2 border-dashed border-stone-700 hover:border-amber-500/50 transition">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
        <UploadCloud className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Upload Raw Phone Photo</h2>
      <p className="text-sm text-stone-400 mb-6">
        Drag & drop any food or pastry photo from your phone. Our AI will fix lighting, clean backgrounds, and style it automatically.
      </p>

      <label className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl cursor-pointer shadow-lg shadow-amber-500/25 transition">
        <Sparkles className="w-5 h-5" />
        <span>{loading ? 'Compressing & Uploading...' : 'Select Photo from Phone'}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={loading}
          onChange={(e) => handleUpload(e.target.files[0])}
        />
      </label>

      <div className="mt-6 flex items-center justify-center space-x-4 text-xs text-stone-500">
        <span>JPG, PNG, WEBP up to 15MB</span>
        <span>•</span>
        <span>Auto-downscaled to 1080x1080</span>
      </div>
    </div>
  );
}
