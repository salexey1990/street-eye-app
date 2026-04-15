import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useProfileStore, toUI, toBackend } from '@/store/profile.store';

jest.mock('@/lib/api/profile', () => ({
  profileApi: {
    getProfile: jest.fn(),
    getStats: jest.fn(),
    getBadges: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
    savePushToken: jest.fn(),
    deletePushToken: jest.fn(),
  },
}));

import { profileApi } from '@/lib/api/profile';

const mockProfile = {
  id: 'user-1',
  email: 'test@test.com',
  isEmailVerified: true,
  locale: 'RU' as const,
  level: 'BEGINNER' as const,
  preferredCategories: ['VISUAL'],
  createdAt: '2024-01-01T00:00:00Z',
  isPremium: false,
  subscriptionExpiresAt: null,
  stats: { totalCompleted: 5, currentStreak: 2, badgesEarned: 1 },
};

const mockStats = {
  totalCompleted: 5,
  totalSkipped: 2,
  currentStreak: 2,
  longestStreak: 7,
  byCategory: { VISUAL: 3 },
  byRating: { SUCCESS: 4, PARTIAL: 1, FAILED: 0 },
};

beforeEach(() => {
  useProfileStore.setState({
    user: null,
    stats: null,
    badges: [],
    loading: false,
    notificationsEnabled: false,
    reminderTime: '09:00',
  });
  jest.clearAllMocks();
});

describe('useProfileStore', () => {
  describe('utility functions', () => {
    it('toUI maps RESTRICTION to LIMITATIONS', () => {
      expect(toUI('RESTRICTION')).toBe('LIMITATIONS');
    });

    it('toUI leaves other categories unchanged', () => {
      expect(toUI('VISUAL')).toBe('VISUAL');
      expect(toUI('TECHNICAL')).toBe('TECHNICAL');
      expect(toUI('SOCIAL')).toBe('SOCIAL');
    });

    it('toBackend maps LIMITATIONS to RESTRICTION', () => {
      expect(toBackend('LIMITATIONS')).toBe('RESTRICTION');
    });

    it('toBackend leaves other categories unchanged', () => {
      expect(toBackend('VISUAL')).toBe('VISUAL');
      expect(toBackend('TECHNICAL')).toBe('TECHNICAL');
    });
  });

  describe('load', () => {
    it('loads profile, stats, badges and notification preferences', async () => {
      (profileApi.getProfile as jest.Mock).mockResolvedValueOnce({ data: { data: mockProfile } });
      (profileApi.getStats as jest.Mock).mockResolvedValueOnce({ data: { data: mockStats } });
      (profileApi.getBadges as jest.Mock).mockResolvedValueOnce({ data: { data: [] } });
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('true')   // notifications_enabled
        .mockResolvedValueOnce('08:00'); // notification_time

      await useProfileStore.getState().load();

      const state = useProfileStore.getState();
      expect(state.user).toEqual(mockProfile);
      expect(state.stats).toEqual(mockStats);
      expect(state.notificationsEnabled).toBe(true);
      expect(state.reminderTime).toBe('08:00');
      expect(state.loading).toBe(false);
    });

    it('sets loading=false even when API throws', async () => {
      (profileApi.getProfile as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      (profileApi.getStats as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      (profileApi.getBadges as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await useProfileStore.getState().load();

      expect(useProfileStore.getState().loading).toBe(false);
    });

    it('defaults reminderTime to 09:00 when not stored', async () => {
      (profileApi.getProfile as jest.Mock).mockResolvedValueOnce({ data: { data: mockProfile } });
      (profileApi.getStats as jest.Mock).mockResolvedValueOnce({ data: { data: mockStats } });
      (profileApi.getBadges as jest.Mock).mockResolvedValueOnce({ data: { data: [] } });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await useProfileStore.getState().load();

      expect(useProfileStore.getState().reminderTime).toBe('09:00');
    });
  });

  describe('setUser', () => {
    it('updates user in state', () => {
      useProfileStore.getState().setUser(mockProfile);
      expect(useProfileStore.getState().user).toEqual(mockProfile);
    });
  });

  describe('clear', () => {
    it('resets user, stats and badges', () => {
      useProfileStore.setState({ user: mockProfile, stats: mockStats, badges: [] });
      useProfileStore.getState().clear();
      const state = useProfileStore.getState();
      expect(state.user).toBeNull();
      expect(state.stats).toBeNull();
      expect(state.badges).toEqual([]);
    });
  });

  describe('setNotifications', () => {
    it('schedules daily notification when enabled with granted permission', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({ data: 'ExponentPushToken[abc]' });
      (profileApi.savePushToken as jest.Mock).mockResolvedValueOnce({});

      await useProfileStore.getState().setNotifications(true, '10:00');

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
      const state = useProfileStore.getState();
      expect(state.notificationsEnabled).toBe(true);
      expect(state.reminderTime).toBe('10:00');
    });

    it('does not enable if permission is denied', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });

      await useProfileStore.getState().setNotifications(true, '10:00');

      expect(useProfileStore.getState().notificationsEnabled).toBe(false);
    });

    it('cancels scheduled notifications when disabled', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null); // PUSH_TOKEN_KEY

      await useProfileStore.getState().setNotifications(false);

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
      expect(useProfileStore.getState().notificationsEnabled).toBe(false);
    });

    it('persists notification enabled state to AsyncStorage', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({ data: 'token' });
      (profileApi.savePushToken as jest.Mock).mockResolvedValueOnce({});

      await useProfileStore.getState().setNotifications(true, '09:30');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('notifications_enabled', 'true');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('notification_time', '09:30');
    });
  });

  describe('updateUser', () => {
    it('updates profile and sets user in state', async () => {
      const updated = { ...mockProfile, level: 'INTERMEDIATE' as const };
      (profileApi.updateProfile as jest.Mock).mockResolvedValueOnce({ data: { data: updated } });

      await useProfileStore.getState().updateUser({ level: 'INTERMEDIATE' });

      expect(useProfileStore.getState().user?.level).toBe('INTERMEDIATE');
    });

    it('syncs locale to i18n and AsyncStorage when locale is updated', async () => {
      const updated = { ...mockProfile, locale: 'EN' as const };
      (profileApi.updateProfile as jest.Mock).mockResolvedValueOnce({ data: { data: updated } });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({ locale: 'ru' }));

      await useProfileStore.getState().updateUser({ locale: 'EN' });

      // Verify AsyncStorage was updated
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'onboarding_data',
        expect.stringContaining('"locale":"en"'),
      );
    });
  });

  describe('changePassword', () => {
    it('delegates to profileApi.changePassword', async () => {
      (profileApi.changePassword as jest.Mock).mockResolvedValueOnce({});

      await useProfileStore.getState().changePassword('old-pass', 'new-pass');

      expect(profileApi.changePassword).toHaveBeenCalledWith('old-pass', 'new-pass');
    });
  });

  describe('deleteAccount', () => {
    it('calls profileApi.deleteAccount and clears state', async () => {
      useProfileStore.setState({ user: mockProfile, stats: mockStats });
      (profileApi.deleteAccount as jest.Mock).mockResolvedValueOnce({});

      await useProfileStore.getState().deleteAccount();

      expect(profileApi.deleteAccount).toHaveBeenCalled();
      expect(useProfileStore.getState().user).toBeNull();
    });
  });
});
