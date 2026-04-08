import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Locale = 'ru' | 'en';
type Level = 'BEGINNER' | 'INTERMEDIATE' | 'PRO';
type Category = 'VISUAL' | 'TECHNICAL' | 'SOCIAL' | 'LIMITATIONS';

export interface OnboardingData {
  locale: Locale;
  level: Level;
  preferredCategories: Category[];
}

interface SettingsState {
  onboardingComplete: boolean;
  onboardingData: OnboardingData;

  loadOnboardingState: () => Promise<void>;
  setOnboardingComplete: () => Promise<void>;
  setOnboardingData: (data: Partial<OnboardingData>) => Promise<void>;
}

const DEFAULT_ONBOARDING: OnboardingData = {
  locale: 'ru',
  level: 'BEGINNER',
  preferredCategories: ['VISUAL'],
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  onboardingComplete: false,
  onboardingData: DEFAULT_ONBOARDING,

  async loadOnboardingState() {
    const [complete, raw] = await Promise.all([
      AsyncStorage.getItem('onboarding_complete'),
      AsyncStorage.getItem('onboarding_data'),
    ]);
    const data = raw ? JSON.parse(raw) : DEFAULT_ONBOARDING;
    set({
      onboardingComplete: complete === 'true',
      onboardingData: { ...DEFAULT_ONBOARDING, ...data },
    });
  },

  async setOnboardingComplete() {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    set({ onboardingComplete: true });
  },

  async setOnboardingData(partial) {
    const current = get().onboardingData;
    const updated = { ...current, ...partial };
    await AsyncStorage.setItem('onboarding_data', JSON.stringify(updated));
    set({ onboardingData: updated });
  },
}));
