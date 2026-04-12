import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FREE_MONTHLY_LIMIT   = 10;
const FREE_SWAPS_PER_SESSION   = 1;
const PREMIUM_SWAPS_PER_SESSION = 3;

function monthKey(): string {
  const d = new Date();
  return `tasks_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

  // Computed helpers
  isAtMonthlyLimit: () => boolean;
  swapsPerSession:  () => number;

  // Actions
  loadFromProfile:     (isPremium: boolean) => Promise<void>;
  setIsPremium:        (val: boolean) => void;
  incrementTaskCount:  () => Promise<void>;
  checkAndResetMonth:  () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isPremium:      false,
  tasksThisMonth: 0,
  monthResetDate: nextMonthReset(),

  isAtMonthlyLimit: () => {
    const { isPremium, tasksThisMonth } = get();
    return !isPremium && tasksThisMonth >= FREE_MONTHLY_LIMIT;
  },

  swapsPerSession: () => (get().isPremium ? PREMIUM_SWAPS_PER_SESSION : FREE_SWAPS_PER_SESSION),

  async loadFromProfile(isPremium) {
    await get().checkAndResetMonth();
    const raw = await AsyncStorage.getItem(monthKey());
    const count = raw ? parseInt(raw, 10) : 0;
    set({ isPremium, tasksThisMonth: count, monthResetDate: nextMonthReset() });
  },

  setIsPremium(val) {
    set({ isPremium: val });
  },

  async incrementTaskCount() {
    if (get().isPremium) return;
    const key  = monthKey();
    const next = get().tasksThisMonth + 1;
    await AsyncStorage.setItem(key, String(next));
    set({ tasksThisMonth: next });
  },

  async checkAndResetMonth() {
    // Old month keys just stay in AsyncStorage with 0 reads — no explicit reset needed.
    // Reading monthKey() naturally picks the current month.
  },
}));

export { FREE_MONTHLY_LIMIT };
