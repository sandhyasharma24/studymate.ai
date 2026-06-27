import { apiClient } from './client';

export const pdfsApi = {
  list: async () => {
    const response = await apiClient.get('/pdfs');
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get(`/pdfs/${id}`);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/pdfs/${id}`);
    return response.data;
  },
  upload: async (file: File, onUploadProgress?: (progressEvent: any) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/pdfs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  },
  triggerIndex: async (id: string) => {
    const response = await apiClient.post(`/pdfs/${id}/index`);
    return response.data;
  },
};
