import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { profileApi, UserProfile, JournalStats, Badge, UpdateUserDto } from '@/lib/api/profile';
import i18n from '@/lib/i18n';

const NOTIF_ENABLED_KEY = 'notifications_enabled';
const NOTIF_TIME_KEY    = 'notification_time';
const PUSH_TOKEN_KEY    = 'push_token';

// Convert backend RESTRICTION ↔ UI LIMITATIONS
export const toUI       = (c: string) => (c === 'RESTRICTION' ? 'LIMITATIONS' : c);
export const toBackend  = (c: string) => (c === 'LIMITATIONS' ? 'RESTRICTION' : c);

interface ProfileState {
  user:                 UserProfile | null;
  stats:                JournalStats | null;
  badges:               Badge[];
  loading:              boolean;
  notificationsEnabled: boolean;
  reminderTime:         string; // 'HH:MM'

  load:             () => Promise<void>;
  updateUser:       (dto: UpdateUserDto) => Promise<void>;
  changePassword:   (current: string, next: string) => Promise<void>;
  deleteAccount:    () => Promise<void>;
  setNotifications: (enabled: boolean, time?: string) => Promise<void>;
  setUser:          (user: UserProfile) => void;
  clear:            () => void;
}

async function scheduleDailyReminder(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    identifier: 'daily_reminder',
    content: {
      title: 'StreetEye',
      body: i18n.t('profile.notifications.reminderBody'),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hours,
      minute: minutes,
    },
  });
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  user:                 null,
  stats:                null,
  badges:               [],
  loading:              false,
  notificationsEnabled: false,
  reminderTime:         '09:00',

  async load() {
    set({ loading: true });
    try {
      const [profileRes, statsRes, badgesRes, notifEnabled, notifTime] = await Promise.all([
        profileApi.getProfile(),
        profileApi.getStats(),
        profileApi.getBadges(),
        AsyncStorage.getItem(NOTIF_ENABLED_KEY),
        AsyncStorage.getItem(NOTIF_TIME_KEY),
      ]);
      set({
        user:                 profileRes.data.data,
        stats:                statsRes.data.data,
        badges:               badgesRes.data.data,
        notificationsEnabled: notifEnabled === 'true',
        reminderTime:         notifTime ?? '09:00',
        loading:              false,
      });
    } catch {
      set({ loading: false });
    }
  },

  async updateUser(dto) {
    const res = await profileApi.updateProfile(dto);
    set({ user: res.data.data });
    // Sync locale to i18n and AsyncStorage
    if (dto.locale) {
      const locale = dto.locale.toLowerCase() as 'ru' | 'en';
      await i18n.changeLanguage(locale);
      const raw = await AsyncStorage.getItem('onboarding_data');
      const data = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem('onboarding_data', JSON.stringify({ ...data, locale }));
    }
    // Sync level/categories to AsyncStorage for future registrations
    if (dto.level || dto.preferredCategories) {
      const raw = await AsyncStorage.getItem('onboarding_data');
      const data = raw ? JSON.parse(raw) : {};
      if (dto.level) data.level = dto.level;
      if (dto.preferredCategories) {
        data.preferredCategories = dto.preferredCategories.map(toUI);
      }
      await AsyncStorage.setItem('onboarding_data', JSON.stringify(data));
    }
  },

  async changePassword(current, next) {
    await profileApi.changePassword(current, next);
  },

  async deleteAccount() {
    await profileApi.deleteAccount();
    get().clear();
  },

  async setNotifications(enabled, time) {
    const newTime = time ?? get().reminderTime;
    await AsyncStorage.setItem(NOTIF_ENABLED_KEY, String(enabled));
    if (time) await AsyncStorage.setItem(NOTIF_TIME_KEY, time);

    if (enabled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        set({ notificationsEnabled: false });
        return;
      }
      await scheduleDailyReminder(newTime);
      // Register push token with backend
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, tokenData.data);
        await profileApi.savePushToken(tokenData.data);
      } catch {
        // Push token registration is best-effort
      }
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (token) {
        try {
          await profileApi.deletePushToken(token);
          await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
        } catch {
          // Best-effort
        }
      }
    }

    set({ notificationsEnabled: enabled, reminderTime: newTime });
  },

  setUser(user) {
    set({ user });
  },

  clear() {
    set({ user: null, stats: null, badges: [] });
  },
}));
