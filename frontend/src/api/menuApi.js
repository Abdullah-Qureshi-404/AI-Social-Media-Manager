import client from './client';

export const menuApi = {
  async ingestFromImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post('/menu/ingest/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async ingestFromUrl(url) {
    const response = await client.post('/menu/ingest/url', { url });
    return response.data;
  },

  async confirmMenu(menuId, items) {
    const response = await client.post(`/menu/${menuId}/confirm`, { items });
    return response.data;
  },

  async updateMenuItem(itemId, data) {
    const response = await client.patch(`/menu/items/${itemId}`, data);
    return response.data;
  },

  async getActiveMenu() {
    try {
      const response = await client.get('/menu/active');
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  async getRecommendations() {
    try {
      const response = await client.get('/menu/recommendations');
      return response.data;
    } catch (err) {
      if (err.response?.status === 401) {
        return [];
      }
      throw err;
    }
  },

  async generateStrategy() {
    const response = await client.post('/menu/strategy/generate');
    return response.data;
  },
};

