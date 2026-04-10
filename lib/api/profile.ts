import { api } from './client';
import i18n from '@/lib/i18n';

export interface UserProfile {
  id: string;
  email: string;
  isEmailVerified: boolean;
  locale: 'EN' | 'RU';
  level: 'BEGINNER' | 'INTERMEDIATE' | 'PRO';
  preferredCategories: string[];
  createdAt: string;
  isPremium: boolean;
  subscriptionExpiresAt: string | null;
  stats: {
    totalCompleted: number;
    currentStreak: number;
    badgesEarned: number;
  };
}

export interface JournalStats {
  totalCompleted: number;
  totalSkipped: number;
  currentStreak: number;
  longestStreak: number;
  byCategory: Record<string, number>;
  byRating: Record<string, number>;
}

export interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  earned: boolean;
  earnedAt: string | null;
}

export interface UpdateUserDto {
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'PRO';
  preferredCategories?: string[];
  locale?: 'EN' | 'RU';
}

const lang = () => ({ 'Accept-Language': i18n.language });

export const profileApi = {
  getProfile: () =>
    api.get<{ data: UserProfile }>('/users/me', { headers: lang() }),

  updateProfile: (dto: UpdateUserDto) =>
    api.patch<{ data: UserProfile }>('/users/me', dto, { headers: lang() }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/users/me/password', { currentPassword, newPassword }),

  deleteAccount: () =>
    api.delete('/users/me'),

  getBadges: () =>
    api.get<{ data: Badge[] }>('/badges', { headers: lang() }),

  getStats: () =>
    api.get<{ data: JournalStats }>('/journal/stats', { headers: lang() }),

  savePushToken: (token: string) =>
    api.post('/users/me/push-token', { token }),

  deletePushToken: (token: string) =>
    api.delete('/users/me/push-token', { params: { token } }),
};
