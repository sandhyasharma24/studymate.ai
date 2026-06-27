import { apiClient } from './client';

export const chatApi = {
  createSession: async (title: string, pdfId?: string | null) => {
    const response = await apiClient.post('/chat/sessions', { title, pdfId });
    return response.data;
  },
  listSessions: async () => {
    const response = await apiClient.get('/chat/sessions');
    return response.data;
  },
  getMessages: async (sessionId: string) => {
    const response = await apiClient.get(`/chat/sessions/${sessionId}/messages`);
    return response.data;
  },
};
