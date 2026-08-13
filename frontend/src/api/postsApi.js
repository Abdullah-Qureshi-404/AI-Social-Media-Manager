import client from './client';

export const postsApi = {
  async uploadPhoto(file, menuItemId, recommendationId) {
    const formData = new FormData();
    formData.append('file', file);
    if (menuItemId) formData.append('menu_item_id', menuItemId);
    if (recommendationId) formData.append('recommendation_id', recommendationId);
    const response = await client.post('/posts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async triggerAIEdit(postId, presetName = 'golden_hour', customInstruction = '') {
    const response = await client.post(`/posts/${postId}/ai-edit`, {
      preset_name: presetName,
      custom_instruction: customInstruction,
    });
    return response.data;
  },

  async uploadEditedImage(postId, imageBlob) {
    const formData = new FormData();
    formData.append('image', imageBlob, 'edited_image.jpg');
    const response = await client.post(`/posts/${postId}/upload-edited-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async generateCaptions(postId, userInstruction = '') {
    const response = await client.post(`/posts/${postId}/generate-captions`, {
      user_instruction: userInstruction,
    });
    return response.data;
  },

  /**
   * Zero-Thinking Smart Overlay.
   * Sends overlay text to backend, which analyzes the image and returns design JSON.
   * @param {string} postId
   * @param {string} captionText - User's overlay text
   * @param {boolean} watermarkEnabled
   * @param {boolean} force - Override manual edit protection (409 Conflict bypass)
   * @returns {{ design: object, post: object }}
   */
  async renderOverlay(postId, captionText, watermarkEnabled = true, force = false) {
    const response = await client.post(`/posts/${postId}/overlay-text`, {
      caption_text: captionText,
      watermark_enabled: watermarkEnabled,
      force,
    });
    return response.data;
  },

  /**
   * Save Fabric.js canvas state after manual editing.
   * Stores the full canvas JSON (including custom object IDs) in the database.
   */
  async saveCanvasState(postId, canvasJson) {
    const response = await client.post(`/posts/${postId}/save-canvas`, {
      canvas_json: canvasJson,
    });
    return response.data;
  },

  async getAutoDesign(postId, captionText = '', refresh = false) {
    const response = await client.post(`/posts/${postId}/auto-design`, null, {
      params: { caption_text: captionText, refresh },
    });
    return response.data;
  },

  async approvePost(postId) {
    const response = await client.post(`/posts/${postId}/approve`);
    return response.data;
  },

  async schedulePost(postId, scheduledAt, caption) {
    const response = await client.post(`/posts/${postId}/schedule`, {
      scheduled_at: scheduledAt,
      caption: caption,
    });
    return response.data;
  },

  async listPosts(statusFilter = null) {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await client.get('/posts', { params });
      return response.data;
    } catch (err) {
      if (err.response?.status === 401) {
        return [];
      }
      throw err;
    }
  },

  async deletePost(postId) {
    const response = await client.delete(`/posts/${postId}`);
    return response.data;
  },
};
