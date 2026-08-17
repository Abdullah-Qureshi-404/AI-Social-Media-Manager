import { create } from 'zustand';

export const usePostFlowStore = create((set) => ({
  activeStep: 1, // 1: Upload, 2: Enhancement, 3: Captions, 4: Smart Overlay, 5: Preview, 6: Schedule
  currentPost: null,
  selectedPreset: 'golden_hour',
  customPrompt: '',
  captionInstruction: '',
  captionTries: 0,
  selectedCaption: '',
  selectedHashtags: [],
  overlayText: '',
  watermarkEnabled: true,
  jobProgress: null,
  isProcessing: false,
  editorImageUrl: null,
  captionSkipped: false,
  hashtagsSkipped: false,

  // AI Recommendation Metadata (belongs to current post flow)
  recommendedPreset: null,
  recommendedCaptionId: null,

  // Smart Overlay Design System
  overlayDesign: null,       // AI-generated overlay design JSON from backend
  fabricCanvasJson: null,    // Full Fabric.js canvas state after manual editing

  setStep: (step) => set({ activeStep: step }),
  setCurrentPost: (post) => set({ currentPost: post }),
  setSelectedPreset: (preset) => set({ selectedPreset: preset }),
  setCustomPrompt: (prompt) => set({ customPrompt: prompt }),
  setCaptionInstruction: (instruction) => set({ captionInstruction: instruction }),
  setCaptionTries: (tries) => set({ captionTries: tries }),
  setSelectedCaption: (caption) => set({ selectedCaption: caption, captionSkipped: false }),
  setSelectedHashtags: (hashtags) => set({ selectedHashtags: hashtags, hashtagsSkipped: false }),
  setOverlayText: (text) => set({ overlayText: text }),
  setWatermarkEnabled: (enabled) => set({ watermarkEnabled: enabled }),
  setJobProgress: (progress) => set({ jobProgress: progress }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setEditorImageUrl: (url) => set({ editorImageUrl: url }),
  setCaptionSkipped: (skipped) => set({ captionSkipped: skipped }),
  setHashtagsSkipped: (skipped) => set({ hashtagsSkipped: skipped }),
  setRecommendedPreset: (preset) => set({ recommendedPreset: preset }),
  setRecommendedCaptionId: (id) => set({ recommendedCaptionId: id }),
  setRecommendations: (preset, captionId) =>
    set({ recommendedPreset: preset, recommendedCaptionId: captionId }),
  setOverlayDesign: (design) => set({ overlayDesign: design }),
  setFabricCanvasJson: (json) => set({ fabricCanvasJson: json }),

  resetFlow: () =>
    set({
      activeStep: 1,
      currentPost: null,
      selectedPreset: 'golden_hour',
      customPrompt: '',
      captionInstruction: '',
      captionTries: 0,
      selectedCaption: '',
      selectedHashtags: [],
      overlayText: '',
      watermarkEnabled: true,
      jobProgress: null,
      isProcessing: false,
      editorImageUrl: null,
      captionSkipped: false,
      hashtagsSkipped: false,
      recommendedPreset: null,
      recommendedCaptionId: null,
      overlayDesign: null,
      fabricCanvasJson: null,
    }),
}));

