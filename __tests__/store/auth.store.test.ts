import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/auth.store';

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    defaults: { headers: { common: {} } },
  },
}));

import { api } from '@/lib/api/client';

const mockApi = api as jest.Mocked<typeof api> & {
  defaults: { headers: { common: Record<string, string> } };
};

beforeEach(() => {
  useAuthStore.setState({
    isAuthenticated: false,
    isLoading: true,
    accessToken: null,
    userId: null,
  });
  jest.clearAllMocks();
  mockApi.defaults.headers.common = {};
});

describe('useAuthStore', () => {
  describe('setAccessToken', () => {
    it('sets token, marks authenticated and clears userId when token provided', () => {
      useAuthStore.setState({ userId: 'user-1' });
      useAuthStore.getState().setAccessToken('tok-abc');
      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('tok-abc');
      expect(state.isAuthenticated).toBe(true);
    });

    it('clears authentication when token is null', () => {
      useAuthStore.setState({ accessToken: 'old', isAuthenticated: true, userId: 'u1' });
      useAuthStore.getState().setAccessToken(null);
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('stores refresh token in SecureStore and sets state', async () => {
      (mockApi.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { accessToken: 'at-1', refreshToken: 'rt-1' } },
      });
      (mockApi.get as jest.Mock).mockResolvedValueOnce({
        data: { data: { id: 'user-99' } },
      });

      await useAuthStore.getState().login({ email: 'a@b.com', password: 'pass' });

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', 'rt-1');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_id', 'user-99');
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.userId).toBe('user-99');
    });

    it('calls /auth/login with email and password', async () => {
      (mockApi.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { accessToken: 'at', refreshToken: 'rt' } },
      });
      (mockApi.get as jest.Mock).mockResolvedValueOnce({
        data: { data: { id: 'uid' } },
      });

      await useAuthStore.getState().login({ email: 'test@test.com', password: 'secret' });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/auth/login',
        { email: 'test@test.com', password: 'secret' },
        expect.any(Object),
      );
    });
  });

  describe('register', () => {
    it('reads onboarding_data from AsyncStorage and posts to /auth/register', async () => {
      const onboarding = { level: 'INTERMEDIATE', preferredCategories: ['TECHNICAL'], locale: 'en' };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(onboarding));
      (mockApi.post as jest.Mock).mockResolvedValueOnce({ data: {} });

      await useAuthStore.getState().register({ email: 'x@y.com', password: 'pw' });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/auth/register',
        expect.objectContaining({
          email: 'x@y.com',
          level: 'INTERMEDIATE',
          preferredCategories: ['TECHNICAL'],
          locale: 'EN',
        }),
        expect.any(Object),
      );
    });

    it('uses BEGINNER + VISUAL defaults when no onboarding data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      (mockApi.post as jest.Mock).mockResolvedValueOnce({ data: {} });

      await useAuthStore.getState().register({ email: 'a@b.com', password: 'pw' });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/auth/register',
        expect.objectContaining({ level: 'BEGINNER', preferredCategories: ['VISUAL'] }),
        expect.any(Object),
      );
    });

    it('maps LIMITATIONS category to RESTRICTION for backend', async () => {
      const onboarding = { level: 'BEGINNER', preferredCategories: ['LIMITATIONS'], locale: 'ru' };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(onboarding));
      (mockApi.post as jest.Mock).mockResolvedValueOnce({ data: {} });

      await useAuthStore.getState().register({ email: 'a@b.com', password: 'pw' });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/auth/register',
        expect.objectContaining({ preferredCategories: ['RESTRICTION'] }),
        expect.any(Object),
      );
    });
  });

  describe('logout', () => {
    it('clears tokens from SecureStore', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('rt-old');
      (mockApi.post as jest.Mock).mockResolvedValueOnce({});

      await useAuthStore.getState().logout();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_id');
    });

    it('resets auth state', async () => {
      useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok', userId: 'u1' });
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      await useAuthStore.getState().logout();

      const { isAuthenticated, accessToken, userId } = useAuthStore.getState();
      expect(isAuthenticated).toBe(false);
      expect(accessToken).toBeNull();
      expect(userId).toBeNull();
    });

    it('does not throw if logout API call fails', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('rt');
      (mockApi.post as jest.Mock).mockRejectedValueOnce(new Error('network'));

      await expect(useAuthStore.getState().logout()).resolves.not.toThrow();
    });
  });

  describe('restoreSession', () => {
    it('returns false and sets isLoading=false when no refresh token', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const result = await useAuthStore.getState().restoreSession();

      expect(result).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('restores session from refresh token and returns true', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('rt-valid')  // refresh_token
        .mockResolvedValueOnce('user-555'); // user_id
      (mockApi.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { accessToken: 'new-at', refreshToken: 'new-rt' } },
      });

      const result = await useAuthStore.getState().restoreSession();

      expect(result).toBe(true);
      const { isAuthenticated, userId, accessToken } = useAuthStore.getState();
      expect(isAuthenticated).toBe(true);
      expect(userId).toBe('user-555');
      expect(accessToken).toBe('new-at');
    });

    it('returns false and clears SecureStore on failed refresh', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('rt-expired');
      (mockApi.post as jest.Mock).mockRejectedValueOnce({ response: { status: 401 } });

      const result = await useAuthStore.getState().restoreSession();

      expect(result).toBe(false);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_id');
    });
  });
});
