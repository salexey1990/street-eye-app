import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, API_TIMEOUT } from '@/constants/config';

export const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const refresh = await SecureStore.getItemAsync('refresh_token');
        if (!refresh) return Promise.reject(error);
        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: refresh });
        const { accessToken, refreshToken } = res.data.data;
        await SecureStore.setItemAsync('refresh_token', refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        error.config.headers.Authorization = `Bearer ${accessToken}`;
        return api(error.config);
      } catch {
        await SecureStore.deleteItemAsync('refresh_token');
        delete api.defaults.headers.common.Authorization;
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// Legacy authApi — kept for backward compat with existing auth screens
export const authApi = {
  async login(body: { email: string; password: string }) {
    const res = await api.post('/auth/login', body);
    const { accessToken, refreshToken } = res.data.data;
    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    return { accessToken, refreshToken };
  },

  async register(body: { email: string; password: string }) {
    await api.post('/auth/register', body);
  },

  async logout() {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (refreshToken) {
      try { await api.post('/auth/logout', { refreshToken }); } catch {}
    }
    delete api.defaults.headers.common.Authorization;
    await SecureStore.deleteItemAsync('refresh_token');
  },
};
