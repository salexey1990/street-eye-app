import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useSubscriptionStore, FREE_MONTHLY_LIMIT } from '@/store/subscription.store';

// Reset the store before each test
beforeEach(() => {
  useSubscriptionStore.setState({
    isPremium: false,
    tasksThisMonth: 0,
    monthResetDate: '1 января',
    userId: null,
  });
  jest.clearAllMocks();
});

describe('useSubscriptionStore', () => {
  describe('isAtMonthlyLimit', () => {
    it('returns false when MONETIZATION_ENABLED is false (always)', () => {
      // MONETIZATION_ENABLED is false in the source, so isAtMonthlyLimit always returns false
      useSubscriptionStore.setState({ isPremium: false, tasksThisMonth: FREE_MONTHLY_LIMIT });
      const { isAtMonthlyLimit } = useSubscriptionStore.getState();
      expect(isAtMonthlyLimit()).toBe(false);
    });

    it('returns false for premium users', () => {
      useSubscriptionStore.setState({ isPremium: true, tasksThisMonth: FREE_MONTHLY_LIMIT });
      expect(useSubscriptionStore.getState().isAtMonthlyLimit()).toBe(false);
    });

    it('returns false when under the limit', () => {
      useSubscriptionStore.setState({ isPremium: false, tasksThisMonth: FREE_MONTHLY_LIMIT - 1 });
      expect(useSubscriptionStore.getState().isAtMonthlyLimit()).toBe(false);
    });
  });

  describe('swapsPerSession', () => {
    it('returns 3 (premium) swaps when MONETIZATION_ENABLED is false', () => {
      useSubscriptionStore.setState({ isPremium: false });
      expect(useSubscriptionStore.getState().swapsPerSession()).toBe(3);
    });

    it('returns 3 for premium users', () => {
      useSubscriptionStore.setState({ isPremium: true });
      expect(useSubscriptionStore.getState().swapsPerSession()).toBe(3);
    });
  });

  describe('setIsPremium', () => {
    it('updates isPremium state', () => {
      useSubscriptionStore.getState().setIsPremium(true);
      expect(useSubscriptionStore.getState().isPremium).toBe(true);
    });

    it('sets isPremium to false', () => {
      useSubscriptionStore.setState({ isPremium: true });
      useSubscriptionStore.getState().setIsPremium(false);
      expect(useSubscriptionStore.getState().isPremium).toBe(false);
    });
  });

  describe('loadFromProfile', () => {
    it('loads userId from SecureStore and count from AsyncStorage', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('user-123');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('5');

      await useSubscriptionStore.getState().loadFromProfile(true);

      const state = useSubscriptionStore.getState();
      expect(state.isPremium).toBe(true);
      expect(state.userId).toBe('user-123');
      expect(state.tasksThisMonth).toBe(5);
    });

    it('defaults tasksThisMonth to 0 when AsyncStorage key is missing', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('user-456');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await useSubscriptionStore.getState().loadFromProfile(false);

      expect(useSubscriptionStore.getState().tasksThisMonth).toBe(0);
    });

    it('uses unknown as userId fallback when SecureStore returns null', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await useSubscriptionStore.getState().loadFromProfile(false);

      expect(useSubscriptionStore.getState().userId).toBe('unknown');
    });
  });

  describe('incrementTaskCount', () => {
    it('does nothing when MONETIZATION_ENABLED is false', async () => {
      useSubscriptionStore.setState({ isPremium: false, tasksThisMonth: 0, userId: 'user-1' });

      await useSubscriptionStore.getState().incrementTaskCount();

      // Since MONETIZATION_ENABLED=false, count should stay 0
      expect(useSubscriptionStore.getState().tasksThisMonth).toBe(0);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });
});
