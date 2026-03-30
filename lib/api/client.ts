import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, API_TIMEOUT } from '@/constants/config';

// Access token lives in memory only
let accessToken: string | null = null;

export const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

async function refreshAccessToken(): Promise<string> {
  const refresh = await SecureStore.getItemAsync('refresh_token');
  if (!refresh) throw new Error('NO_REFRESH_TOKEN');
  const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: refresh });
  accessToken = res.data.data.accessToken;
  return accessToken!;
}

// Auto-refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        await refreshAccessToken();
        error.config.headers.Authorization = `Bearer ${accessToken}`;
        return api(error.config);
      } catch {
        accessToken = null;
        await SecureStore.deleteItemAsync('refresh_token');
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  async login(body: { email: string; password: string }) {
    const res = await api.post('/auth/login', body);
    const { accessToken: at, refreshToken: rt } = res.data.data;
    accessToken = at;
    await SecureStore.setItemAsync('refresh_token', rt);
    return { accessToken: at, refreshToken: rt };
  },

  async register(body: { email: string; password: string }) {
    await api.post('/auth/register', body);
  },

  async logout() {
    accessToken = null;
    await SecureStore.deleteItemAsync('refresh_token');
  },
};
