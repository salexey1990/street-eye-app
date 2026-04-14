import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const FREE_MONTHLY_LIMIT       = 10;
const FREE_SWAPS_PER_SESSION   = 1;
const PREMIUM_SWAPS_PER_SESSION = 3;

function monthKey(userId: string): string {
  const d = new Date();
  return `tasks_${userId}_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonthReset(): string {
  const d = new Date();
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return next.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

interface SubscriptionState {
  isPremium:        boolean;
  tasksThisMonth:   number;
  monthResetDate:   string;
  userId:           string | null;

  // Computed helpers
  isAtMonthlyLimit: () => boolean;
  swapsPerSession:  () => number;

  // Actions
  loadFromProfile:    (isPremium: boolean) => Promise<void>;
  setIsPremium:       (val: boolean) => void;
  incrementTaskCount: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isPremium:      false,
  tasksThisMonth: 0,
  monthResetDate: nextMonthReset(),
  userId:         null,

  isAtMonthlyLimit: () => {
    const { isPremium, tasksThisMonth } = get();
    return !isPremium && tasksThisMonth >= FREE_MONTHLY_LIMIT;
  },

  swapsPerSession: () => (get().isPremium ? PREMIUM_SWAPS_PER_SESSION : FREE_SWAPS_PER_SESSION),

  async loadFromProfile(isPremium) {
    // userId is written to SecureStore during login / restoreSession
    const userId = (await SecureStore.getItemAsync('user_id')) ?? 'unknown';
    const raw = await AsyncStorage.getItem(monthKey(userId));
    const count = raw ? parseInt(raw, 10) : 0;
    set({ isPremium, userId, tasksThisMonth: count, monthResetDate: nextMonthReset() });
  },

  setIsPremium(val) {
    set({ isPremium: val });
  },

  async incrementTaskCount() {
    if (get().isPremium) return;
    const userId = get().userId ?? 'unknown';
    const key  = monthKey(userId);
    const next = get().tasksThisMonth + 1;
    await AsyncStorage.setItem(key, String(next));
    set({ tasksThisMonth: next });
  },
}));

export { FREE_MONTHLY_LIMIT };
