import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '@/store/settings.store';

beforeEach(() => {
  useSettingsStore.setState({
    onboardingComplete: false,
    onboardingData: {
      locale: 'ru',
      level: 'BEGINNER',
      preferredCategories: ['VISUAL'],
    },
  });
  jest.clearAllMocks();
});

describe('useSettingsStore', () => {
  describe('loadOnboardingState', () => {
    it('sets onboardingComplete to true when AsyncStorage has "true"', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('true')  // onboarding_complete
        .mockResolvedValueOnce(null);   // onboarding_data

      await useSettingsStore.getState().loadOnboardingState();

      expect(useSettingsStore.getState().onboardingComplete).toBe(true);
    });

    it('sets onboardingComplete to false when key is missing', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await useSettingsStore.getState().loadOnboardingState();

      expect(useSettingsStore.getState().onboardingComplete).toBe(false);
    });

    it('parses onboarding_data from AsyncStorage', async () => {
      const stored = { locale: 'en', level: 'INTERMEDIATE', preferredCategories: ['TECHNICAL', 'SOCIAL'] };
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('false')
        .mockResolvedValueOnce(JSON.stringify(stored));

      await useSettingsStore.getState().loadOnboardingState();

      const { onboardingData } = useSettingsStore.getState();
      expect(onboardingData.locale).toBe('en');
      expect(onboardingData.level).toBe('INTERMEDIATE');
      expect(onboardingData.preferredCategories).toEqual(['TECHNICAL', 'SOCIAL']);
    });

    it('uses defaults for missing fields in stored data', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify({ locale: 'en' }));

      await useSettingsStore.getState().loadOnboardingState();

      const { onboardingData } = useSettingsStore.getState();
      expect(onboardingData.locale).toBe('en');
      expect(onboardingData.level).toBe('BEGINNER'); // default
      expect(onboardingData.preferredCategories).toEqual(['VISUAL']); // default
    });
  });

  describe('setOnboardingComplete', () => {
    it('sets onboardingComplete to true in state', async () => {
      await useSettingsStore.getState().setOnboardingComplete();

      expect(useSettingsStore.getState().onboardingComplete).toBe(true);
    });

    it('persists "true" to AsyncStorage', async () => {
      await useSettingsStore.getState().setOnboardingComplete();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('onboarding_complete', 'true');
    });
  });

  describe('setOnboardingData', () => {
    it('merges partial update into existing data', async () => {
      await useSettingsStore.getState().setOnboardingData({ level: 'PRO' });

      const { onboardingData } = useSettingsStore.getState();
      expect(onboardingData.level).toBe('PRO');
      expect(onboardingData.locale).toBe('ru');           // untouched
      expect(onboardingData.preferredCategories).toEqual(['VISUAL']); // untouched
    });

    it('persists merged data to AsyncStorage as JSON', async () => {
      await useSettingsStore.getState().setOnboardingData({ locale: 'en' });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'onboarding_data',
        JSON.stringify({ locale: 'en', level: 'BEGINNER', preferredCategories: ['VISUAL'] }),
      );
    });

    it('allows overwriting preferredCategories array', async () => {
      await useSettingsStore.getState().setOnboardingData({
        preferredCategories: ['TECHNICAL', 'SOCIAL', 'LIMITATIONS'],
      });

      expect(useSettingsStore.getState().onboardingData.preferredCategories).toEqual([
        'TECHNICAL', 'SOCIAL', 'LIMITATIONS',
      ]);
    });
  });
});
