import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useTaskStore } from '@/store/task.store';
import { useSubscriptionStore } from '@/store/subscription.store';

// Mock API modules
jest.mock('@/lib/api/tasks', () => ({
  tasksApi: {
    getAuthRandom: jest.fn(),
    getGuestRandom: jest.fn(),
  },
}));

jest.mock('@/lib/api/sessions', () => ({
  sessionsApi: {
    getActive: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

import { tasksApi } from '@/lib/api/tasks';
import { sessionsApi } from '@/lib/api/sessions';

const mockTask = {
  id: 'task-1',
  title: 'Test Task',
  description: 'Do something creative',
  tip: 'A helpful tip',
  category: 'VISUAL' as const,
  level: 'BEGINNER' as const,
  durationMins: 30,
  tags: ['street', 'light'],
};

beforeEach(() => {
  useTaskStore.setState({
    previewTask: null,
    activeTask: null,
    activeSessionId: null,
    guestTask: null,
    loading: false,
    error: null,
    swapsLeft: 3,
    MAX_SWAPS: 3,
  });
  useSubscriptionStore.setState({ isPremium: false, tasksThisMonth: 0, userId: 'user-1' });
  jest.clearAllMocks();
});

describe('useTaskStore', () => {
  describe('clearPreview', () => {
    it('clears previewTask', () => {
      useTaskStore.setState({ previewTask: mockTask });
      useTaskStore.getState().clearPreview();
      expect(useTaskStore.getState().previewTask).toBeNull();
    });
  });

  describe('clearError', () => {
    it('clears error', () => {
      useTaskStore.setState({ error: 'NETWORK_ERROR' });
      useTaskStore.getState().clearError();
      expect(useTaskStore.getState().error).toBeNull();
    });
  });

  describe('loadInitialTask', () => {
    it('restores active session from server for authenticated users', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('rt-valid');
      const activeSession = {
        sessionId: 'sess-1',
        id: 'task-99',
        title: 'Active Task',
        description: 'Active description',
        tip: 'Active tip',
        category: 'TECHNICAL',
        level: 'INTERMEDIATE',
        durationMins: 45,
        tags: ['motion'],
        startedAt: '2024-01-01T10:00:00Z',
      };
      (sessionsApi.getActive as jest.Mock).mockResolvedValueOnce(activeSession);

      await useTaskStore.getState().loadInitialTask();

      const state = useTaskStore.getState();
      expect(state.activeTask).not.toBeNull();
      expect(state.activeTask?.id).toBe('task-99');
      expect(state.activeSessionId).toBe('sess-1');
      expect(state.loading).toBe(false);
    });

    it('sets activeTask and sessionId to null when no active session on server', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('rt-valid');
      (sessionsApi.getActive as jest.Mock).mockResolvedValueOnce(null);

      await useTaskStore.getState().loadInitialTask();

      const state = useTaskStore.getState();
      expect(state.activeTask).toBeNull();
      expect(state.loading).toBe(false);
    });

    it('restores guest task from AsyncStorage for unauthenticated users', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockTask));

      await useTaskStore.getState().loadInitialTask();

      const state = useTaskStore.getState();
      expect(state.guestTask).toEqual(mockTask);
      expect(state.activeTask).toBeNull();
    });

    it('leaves everything null when no token and no guest task', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await useTaskStore.getState().loadInitialTask();

      const state = useTaskStore.getState();
      expect(state.activeTask).toBeNull();
      expect(state.guestTask).toBeNull();
    });
  });

  describe('fetchPreview', () => {
    it('does nothing when swapsLeft is 0', async () => {
      useTaskStore.setState({ swapsLeft: 0 });

      await useTaskStore.getState().fetchPreview();

      expect(tasksApi.getAuthRandom).not.toHaveBeenCalled();
      expect(tasksApi.getGuestRandom).not.toHaveBeenCalled();
    });

    it('fetches auth task for authenticated users and decrements swapsLeft', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('rt-valid');
      (tasksApi.getAuthRandom as jest.Mock).mockResolvedValueOnce(mockTask);
      useTaskStore.setState({ swapsLeft: 3 });

      await useTaskStore.getState().fetchPreview();

      const state = useTaskStore.getState();
      expect(state.previewTask).toEqual(mockTask);
      expect(state.swapsLeft).toBe(2);
    });

    it('fetches guest task for unauthenticated users', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      const onboarding = { level: 'BEGINNER', preferredCategories: ['VISUAL'] };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(onboarding));
      (tasksApi.getGuestRandom as jest.Mock).mockResolvedValueOnce(mockTask);
      useTaskStore.setState({ swapsLeft: 2 });

      await useTaskStore.getState().fetchPreview();

      expect(tasksApi.getGuestRandom).toHaveBeenCalled();
      expect(useTaskStore.getState().previewTask).toEqual(mockTask);
    });

    it('sets error code on API failure', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('rt-valid');
      (tasksApi.getAuthRandom as jest.Mock).mockRejectedValueOnce({
        response: { data: { error: { code: 'NO_TASKS_AVAILABLE' } } },
      });

      await useTaskStore.getState().fetchPreview();

      expect(useTaskStore.getState().error).toBe('NO_TASKS_AVAILABLE');
    });

    it('sets NETWORK_ERROR when no error code in response', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('rt-valid');
      (tasksApi.getAuthRandom as jest.Mock).mockRejectedValueOnce(new Error('timeout'));

      await useTaskStore.getState().fetchPreview();

      expect(useTaskStore.getState().error).toBe('NETWORK_ERROR');
    });
  });

  describe('acceptTask', () => {
    it('creates session and moves previewTask to activeTask', async () => {
      useTaskStore.setState({ previewTask: mockTask });
      (sessionsApi.create as jest.Mock).mockResolvedValueOnce({
        id: 'sess-new',
        status: 'ACTIVE',
        startedAt: '2024-01-01T10:00:00Z',
        completedAt: null,
      });

      const sessionId = await useTaskStore.getState().acceptTask('task-1');

      expect(sessionId).toBe('sess-new');
      const state = useTaskStore.getState();
      expect(state.activeTask).toEqual(mockTask);
      expect(state.activeSessionId).toBe('sess-new');
      expect(state.previewTask).toBeNull();
    });
  });

  describe('resumeSavedTask', () => {
    it('creates a new session and sets activeTask from saved session data', async () => {
      const saved = {
        id: 'sess-saved',
        taskId: 'task-42',
        title: 'Saved Task',
        description: 'Saved description',
        tip: 'A tip',
        category: 'SOCIAL',
        level: 'INTERMEDIATE',
        durationMins: 60,
        tags: ['people'],
        startedAt: '2024-01-01T10:00:00Z',
        completedAt: null,
      };
      (sessionsApi.create as jest.Mock).mockResolvedValueOnce({
        id: 'sess-new-42',
        status: 'ACTIVE',
        startedAt: '2024-01-01T11:00:00Z',
        completedAt: null,
      });

      await useTaskStore.getState().resumeSavedTask(saved);

      expect(sessionsApi.create).toHaveBeenCalledWith('task-42');
      const state = useTaskStore.getState();
      expect(state.activeTask?.id).toBe('task-42');
      expect(state.activeTask?.title).toBe('Saved Task');
      expect(state.activeSessionId).toBe('sess-new-42');
      expect(state.previewTask).toBeNull();
      expect(state.guestTask).toBeNull();
    });
  });

  describe('closeSession', () => {
    it('updates session status and resets task state', async () => {
      useTaskStore.setState({ activeTask: mockTask, activeSessionId: 'sess-42', guestTask: null });
      (sessionsApi.updateStatus as jest.Mock).mockResolvedValueOnce({
        id: 'sess-42',
        status: 'COMPLETED',
        startedAt: '2024-01-01T10:00:00Z',
        completedAt: '2024-01-01T11:00:00Z',
      });

      await useTaskStore.getState().closeSession('COMPLETED');

      expect(sessionsApi.updateStatus).toHaveBeenCalledWith('sess-42', 'COMPLETED');
      const state = useTaskStore.getState();
      expect(state.activeTask).toBeNull();
      expect(state.activeSessionId).toBeNull();
    });

    it('skips API call and warns when no activeSessionId', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      useTaskStore.setState({ activeSessionId: null });

      await useTaskStore.getState().closeSession('SKIPPED');

      expect(sessionsApi.updateStatus).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('cleans up guest_active_task from AsyncStorage', async () => {
      useTaskStore.setState({ activeTask: mockTask, activeSessionId: null, guestTask: mockTask });

      await useTaskStore.getState().closeSession('COMPLETED');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('guest_active_task');
    });
  });
});
