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
import { Lightbulb, Check } from 'lucide-react';

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
      {/* Polished Flow Wizard Progress Stepper */}
      <div className="flex items-center justify-between border-b border-white/5 pb-6 overflow-x-auto relative px-2">
        {[
          { num: 1, label: 'Upload' },
          { num: 2, label: 'Enhancement' },
          { num: 3, label: 'Captions' },
          { num: 4, label: 'Overlay' },
          { num: 5, label: 'Preview' },
          { num: 6, label: 'Schedule' },
        ].map((s, idx, arr) => {
          const allowed = isStepAllowed(s.num);
          const isActive = activeStep === s.num;
          const isCompleted = activeStep > s.num;

          return (
            <React.Fragment key={s.num}>
              <button
                onClick={() => allowed && setStep(s.num)}
                disabled={!allowed}
                className={`flex items-center space-x-2.5 font-semibold text-xs sm:text-sm shrink-0 transition relative z-10 ${
                  isActive
                    ? 'text-amber-400 font-bold'
                    : isCompleted
                    ? 'text-zinc-200 hover:text-white cursor-pointer'
                    : allowed
                    ? 'text-zinc-400 hover:text-zinc-200 cursor-pointer'
                    : 'text-zinc-600 opacity-40 cursor-not-allowed'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                      : isActive
                      ? 'bg-amber-500 text-zinc-950 ring-4 ring-amber-500/30 animate-pulse shadow-lg shadow-amber-500/30'
                      : allowed
                      ? 'bg-zinc-800 text-zinc-300 border border-white/10'
                      : 'bg-zinc-900 text-zinc-600 border border-white/5'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 text-zinc-950 stroke-[3]" /> : s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>

              {idx < arr.length - 1 && (
                <div className="flex-1 mx-2 hidden sm:block h-0.5 min-w-[20px]">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      activeStep > s.num ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-zinc-800'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Context Banner */}
      {context?.menuItemId && activeStep === 1 && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center space-x-3 text-xs shadow-lg">
          <Lightbulb className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h4 className="font-semibold text-amber-400">Content Strategy Active</h4>
            <p className="text-zinc-300 mt-0.5">Upload a photo of your menu item to fulfill this recommendation. The system will tailor on-brand captions.</p>
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
              className="w-full mt-6 py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/15 transition flex items-center justify-center space-x-2"
            >
              <span>Next: Caption Style & Hashtags ➔</span>
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
