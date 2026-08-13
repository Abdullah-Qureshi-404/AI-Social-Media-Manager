import React, { useState } from 'react';
import ImageUploader from '../components/post/ImageUploader';
import PresetSelector from '../components/post/PresetSelector';
import ComparisonSlider from '../components/post/ComparisonSlider';
import JobProgressTracker from '../components/post/JobProgressTracker';
import CaptionPicker from '../components/post/CaptionPicker';
import OverlayEditor from '../components/post/OverlayEditor';
import PostPreview from '../components/post/PostPreview';
import ScheduleModal from '../components/post/ScheduleModal';
import EditModal from '../components/post/EditModal';
import { usePostFlowStore } from '../store/postFlowStore';
import { postsApi } from '../api/postsApi';
import { subscribeToJobStream } from '../api/jobStreamer';
import { Lightbulb } from 'lucide-react';

export default function CreatePost({ context }) {
  const {
    activeStep,
    setStep,
    currentPost,
    setCurrentPost,
    jobProgress,
    setJobProgress,
    captionTries,
    setCaptionTries,
    selectedCaption,
    selectedHashtags,
    resetFlow,
  } = usePostFlowStore();

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleTriggerEdit = async (presetName, customInstruction) => {
    if (!currentPost) return;
    setIsEnhancing(true);
    try {
      const res = await postsApi.triggerAIEdit(currentPost.id, presetName, customInstruction);
      subscribeToJobStream(res.job_id, (data) => {
        setJobProgress(data);
        if (data.status === 'READY') {
          postsApi.listPosts().then((posts) => {
            const updated = posts.find((p) => p.id === currentPost.id);
            if (updated) setCurrentPost(updated);
            setIsEnhancing(false);
          });
        } else if (data.status === 'FAILED') {
          setIsEnhancing(false);
        }
      });
    } catch (err) {
      setIsEnhancing(false);
      alert('Photo enhancement failed. Please try again.');
    }
  };

  const handleGenerateCaptions = async (userInstruction) => {
    if (!currentPost) return;
    setIsGeneratingCaptions(true);
    try {
      const res = await postsApi.generateCaptions(currentPost.id, userInstruction);
      setCaptionTries(captionTries + 1);
      setIsGeneratingCaptions(false);
      return res;
    } catch (err) {
      setIsGeneratingCaptions(false);
      alert('Failed to generate captions.');
      return null;
    }
  };

  const handleSaveCanvasEdit = async (blob) => {
    if (!currentPost) return;
    try {
      const updatedPost = await postsApi.uploadEditedImage(currentPost.id, blob);
      setCurrentPost(updatedPost);
      setIsEditModalOpen(false);
    } catch (err) {
      alert('Failed to save edited canvas image.');
    }
  };

  const handleSchedule = async (scheduledAt) => {
    if (!currentPost) return;
    try {
      await postsApi.approvePost(currentPost.id);
      const fullCaption = `${selectedCaption}\n\n${selectedHashtags.join(' ')}`;
      await postsApi.schedulePost(currentPost.id, scheduledAt, fullCaption);
      alert('Post successfully scheduled for Instagram!');
      resetFlow();
    } catch (err) {
      alert('Failed to schedule post.');
    }
  };

  const handlePostNow = async () => {
    const now = new Date().toISOString();
    await handleSchedule(now);
  };

  const isStepAllowed = (stepNum) => {
    if (stepNum === 1) return true;
    if (!currentPost) return false;
    return true;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Flow Wizard Navigation Bar */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-4 overflow-x-auto">
        {[
          { num: 1, label: 'Upload' },
          { num: 2, label: 'Enhancement' },
          { num: 3, label: 'Captions' },
          { num: 4, label: 'Overlay' },
          { num: 5, label: 'Preview' },
          { num: 6, label: 'Schedule' },
        ].map((s) => {
          const allowed = isStepAllowed(s.num);
          const isActive = activeStep === s.num;
          return (
            <button
              key={s.num}
              onClick={() => allowed && setStep(s.num)}
              disabled={!allowed}
              className={`flex items-center space-x-2 font-semibold text-xs sm:text-sm shrink-0 px-3 py-1 transition ${
                isActive
                  ? 'text-amber-400 font-bold border-b-2 border-amber-400 pb-1'
                  : allowed
                  ? 'text-stone-400 hover:text-stone-200 cursor-pointer'
                  : 'text-stone-600 opacity-40 cursor-not-allowed'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : allowed
                    ? 'bg-stone-800 text-stone-400'
                    : 'bg-stone-900 text-stone-600 border border-stone-800'
                }`}
              >
                {s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Context Banner */}
      {context?.menuItemId && activeStep === 1 && (
        <div className="bg-amber-900/30 border border-amber-500/30 p-4 rounded-xl flex items-center space-x-3">
          <Lightbulb className="w-6 h-6 text-amber-500 shrink-0" />
          <div>
            <h4 className="font-bold text-amber-400">AI Strategy Active</h4>
            <p className="text-sm text-stone-300">Upload a photo of your menu item to fulfill this recommendation. Gemini will automatically tailor the caption.</p>
          </div>
        </div>
      )}

      {/* Step 1 View: Upload Raw Photo */}
      {activeStep === 1 && <ImageUploader context={context} />}

      {/* Step 2 View: Photo Enhancement */}
      {activeStep === 2 && currentPost && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <ComparisonSlider
              originalUrl={currentPost.original_image_url}
              editedUrl={currentPost.current_edited_image_url || currentPost.temp_image_url || currentPost.original_image_url}
            />
            <JobProgressTracker progress={jobProgress} />
          </div>
          <div>
            <PresetSelector
              onTriggerEdit={handleTriggerEdit}
              editCount={currentPost.edit_count || 0}
              isLoading={jobProgress && jobProgress.progress_percent > 0 && jobProgress.progress_percent < 100}
              isEnhancing={isEnhancing}
            />
            <button
              onClick={() => setStep(3)}
              className="w-full mt-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-extrabold rounded-xl shadow-lg transition"
            >
              Next: Caption Style & Hashtags ➔
            </button>
          </div>
        </div>
      )}

      {/* Step 3 View: Captions & Hashtags */}
      {activeStep === 3 && (
        <div className="max-w-2xl mx-auto space-y-6">
          <CaptionPicker
            onGenerateCaptions={handleGenerateCaptions}
            onNextStep={() => setStep(4)}
            isGenerating={isGeneratingCaptions}
          />
        </div>
      )}

      {/* Step 4 View: Zero-Thinking Smart Overlay */}
      {activeStep === 4 && (
        <div className="max-w-2xl mx-auto space-y-6">
          <OverlayEditor onNextStep={() => setStep(5)} />
        </div>
      )}

      {/* Step 5 View: Post Preview */}
      {activeStep === 5 && currentPost && (
        <div className="space-y-6">
          <PostPreview
            onProceedToSchedule={() => setStep(6)}
            onOpenEditModal={() => setIsEditModalOpen(true)}
          />
        </div>
      )}

      {/* Step 6 View: Schedule & Post Now */}
      {activeStep === 6 && currentPost && (
        <div className="max-w-2xl mx-auto space-y-6">
          <ScheduleModal onSchedule={handleSchedule} onPostNow={handlePostNow} />
        </div>
      )}

      {/* Fullscreen Fabric.js Canvas Editor Modal */}
      {currentPost && (
        <EditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          imageUrl={currentPost.current_edited_image_url || currentPost.temp_image_url || currentPost.original_image_url}
          postId={currentPost.id}
          onSave={handleSaveCanvasEdit}
        />
      )}
    </div>
  );
}
