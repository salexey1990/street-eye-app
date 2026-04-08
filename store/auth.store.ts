import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/api/client';
import i18n from '@/lib/i18n';

type Level = 'BEGINNER' | 'INTERMEDIATE' | 'PRO';
type Category = 'VISUAL' | 'TECHNICAL' | 'SOCIAL' | 'LIMITATIONS';
type BackendCategory = 'VISUAL' | 'TECHNICAL' | 'SOCIAL' | 'RESTRICTION';

const toBackendCategory = (c: Category): BackendCategory =>
  c === 'LIMITATIONS' ? 'RESTRICTION' : c;

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;

  setAccessToken: (token: string | null) => void;

  login: (body: { email: string; password: string }) => Promise<void>;
  register: (body: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  accessToken: null,

  setAccessToken: (token) => set({ accessToken: token, isAuthenticated: !!token }),

  async login({ email, password }) {
    const res = await api.post('/auth/login', { email, password }, {
      headers: { 'Accept-Language': i18n.language },
    });
    const { accessToken, refreshToken } = res.data.data;
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    set({ accessToken, isAuthenticated: true });
  },

  async register({ email, password }) {
    const raw = await AsyncStorage.getItem('onboarding_data');
    const onboarding = raw ? JSON.parse(raw) : {};

    const categories: Category[] = onboarding.preferredCategories ?? ['VISUAL'];
    const locale = (onboarding.locale ?? 'en').toUpperCase();

    await api.post('/auth/register', {
      email,
      password,
      level: onboarding.level ?? 'BEGINNER',
      preferredCategories: categories.map(toBackendCategory),
      locale,
    }, {
      headers: { 'Accept-Language': i18n.language },
    });
  },

  async logout() {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch {
        // ignore — token may already be invalid
      }
    }
    set({ accessToken: null, isAuthenticated: false });
    await SecureStore.deleteItemAsync('refresh_token');
  },

  async restoreSession(): Promise<boolean> {
    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!refreshToken) {
        set({ isLoading: false });
        return false;
      }
      const res = await api.post('/auth/refresh', { refreshToken });
      const { accessToken: at, refreshToken: rt } = res.data.data;
      await SecureStore.setItemAsync('refresh_token', rt);
      set({ accessToken: at, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      await SecureStore.deleteItemAsync('refresh_token');
      set({ accessToken: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },
}));

// Sync in-memory token with axios interceptor
useAuthStore.subscribe((state) => {
  if (state.accessToken) {
    api.defaults.headers.common.Authorization = `Bearer ${state.accessToken}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
});
