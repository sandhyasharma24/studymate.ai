import { apiClient } from './client';

export const authApi = {
  login: async (payload: any) => {
    const response = await apiClient.post('/auth/login', payload);
    return response.data;
  },
  register: async (payload: any) => {
    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  },
  logout: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/logout', { refreshToken });
    return response.data;
  },
};
