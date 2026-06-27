import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { useUIStore } from '../store/uiStore';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const { login, logout, user, isAuthenticated } = useAuthStore();
  const { showToast } = useUIStore();

  const handleLogin = async (payload: any) => {
    setLoading(true);
    try {
      const data = await authApi.login(payload);
      login(data.accessToken, data.refreshToken, {
        id: data.userId,
        email: data.email,
        role: data.role,
      });
      showToast('Logged in successfully!', 'success');
      return true;
    } catch (err: any) {
      showToast(err.response?.data?.message || err.response?.data?.detail || 'Login failed. Please check your credentials.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (payload: any) => {
    setLoading(true);
    try {
      await authApi.register(payload);
      showToast('Registration successful! Please log in.', 'success');
      return true;
    } catch (err: any) {
      showToast(err.response?.data?.message || err.response?.data?.detail || 'Registration failed. Email might be in use.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch (e) {
        // Soft fail on network error during logout
      }
    }
    logout();
    showToast('Logged out successfully.', 'info');
  };

  return {
    loading,
    user,
    isAuthenticated,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };
};
