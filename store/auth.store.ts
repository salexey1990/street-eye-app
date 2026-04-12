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
  userId: string | null;

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
  userId: null,

  setAccessToken: (token) => set({ accessToken: token, isAuthenticated: !!token, userId: token ? get().userId : null }),

  async login({ email, password }) {
    const res = await api.post('/auth/login', { email, password }, {
      headers: { 'Accept-Language': i18n.language },
    });
    const { accessToken, refreshToken } = res.data.data;
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    // Set token only — subscriber sets Authorization header synchronously.
    // Do NOT set isAuthenticated yet: navigation to tabs must not happen
    // before userId is known, otherwise journal.load() runs with userId=''.
    set({ accessToken, isAuthenticated: false, userId: null });
    const me = await api.get('/users/me');
    const userId: string = me.data.data.id;
    await SecureStore.setItemAsync('user_id', userId);
    // Single atomic update — tabs render only after userId is ready.
    set({ isAuthenticated: true, userId });
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
    set({ accessToken: null, isAuthenticated: false, userId: null });
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user_id');
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
      // Restore userId from SecureStore — avoids an extra GET /users/me on every cold start
      const userId = (await SecureStore.getItemAsync('user_id')) ?? '';
      set({ accessToken: at, isAuthenticated: true, isLoading: false, userId });
      return true;
    } catch {
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('user_id');
      set({ accessToken: null, isAuthenticated: false, isLoading: false, userId: null });
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
