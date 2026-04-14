import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import i18n from '@/lib/i18n';
import { Task, tasksApi } from '@/lib/api/tasks';
import { SavedSession, sessionsApi } from '@/lib/api/sessions';
import { useSubscriptionStore } from '@/store/subscription.store';

type SessionStatus = 'COMPLETED' | 'SKIPPED' | 'SAVED_FOR_LATER';

interface TaskState {
  // Current task being shown (before accepting)
  previewTask:   Task | null;
  // Active session task (accepted)
  activeTask:    Task | null;
  activeSessionId: string | null;
  // Guest task (from onboarding, stored in AsyncStorage)
  guestTask:     Task | null;

  loading:       boolean;
  error:         string | null;
  // How many "another task" swaps remain this session
  swapsLeft:     number;
  MAX_SWAPS:     number;

  loadInitialTask:  () => Promise<void>;
  fetchPreview:     () => Promise<void>;
  acceptTask:       (taskId: string) => Promise<string>; // returns sessionId
  resumeSavedTask:  (saved: SavedSession) => Promise<void>;
  closeSession:     (status: SessionStatus) => Promise<void>;
  clearPreview:     () => void;
  clearError:       () => void;
}

const MAX_SWAPS_AUTH = 3; // Premium; Free is 1 — resolved from subscriptionStore at session start

export const useTaskStore = create<TaskState>((set, get) => ({
  previewTask:     null,
  activeTask:      null,
  activeSessionId: null,
  guestTask:       null,
  loading:         false,
  error:           null,
  swapsLeft:       MAX_SWAPS_AUTH,
  MAX_SWAPS:       MAX_SWAPS_AUTH,

  async loadInitialTask() {
    // Set swaps based on current subscription tier
    const swaps = useSubscriptionStore.getState().swapsPerSession();
    set({ loading: true, error: null, swapsLeft: swaps, MAX_SWAPS: swaps });
    const locale = i18n.language as 'ru' | 'en';

    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');

      if (refreshToken) {
        // Authenticated: try to restore active session from server
        const active = await sessionsApi.getActive(locale).catch(() => null);
        if (active) {
          set({
            activeTask: {
              id:          active.id,
              title:       active.title,
              description: active.description,
              tip:         active.tip,
              category:    active.category as Task['category'],
              level:       active.level as Task['level'],
              durationMins:active.durationMins,
              tags:        active.tags,
            },
            activeSessionId: active.sessionId,
            guestTask:       null,
          });
          return;
        }
      } else {
        // Guest: try to restore task from AsyncStorage
        const raw = await AsyncStorage.getItem('guest_active_task');
        if (raw) {
          const task: Task = JSON.parse(raw);
          set({ guestTask: task, activeTask: null, activeSessionId: null });
          return;
        }
      }

      set({ activeTask: null, guestTask: null, activeSessionId: null });
    } catch {
      // silent — will just show state B
    } finally {
      set({ loading: false });
    }
  },

  async fetchPreview() {
    const { swapsLeft } = get();
    if (swapsLeft <= 0) return;
    // Monthly limit check (authenticated only)
    const sub = useSubscriptionStore.getState();
    if (sub.isAtMonthlyLimit()) {
      set({ error: 'MONTHLY_LIMIT_REACHED' });
      return;
    }

    set({ loading: true, error: null });
    const locale = i18n.language as 'ru' | 'en';

    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      let task: Task;

      if (refreshToken) {
        task = await tasksApi.getAuthRandom({ locale });
      } else {
        const raw = await AsyncStorage.getItem('onboarding_data');
        const { level = 'BEGINNER', preferredCategories = ['VISUAL'] } =
          raw ? JSON.parse(raw) : {};
        task = await tasksApi.getGuestRandom({ locale, level, categories: preferredCategories });
      }

      set((s) => ({ previewTask: task, swapsLeft: s.swapsLeft - 1 }));
    } catch (e: any) {
      const code = e?.response?.data?.error?.code;
      set({ error: code ?? 'NETWORK_ERROR' });
    } finally {
      set({ loading: false });
    }
  },

  async acceptTask(taskId) {
    const session = await sessionsApi.create(taskId);
    const { previewTask } = get();
    set({ activeTask: previewTask, activeSessionId: session.id, previewTask: null });
    // Increment monthly counter
    await useSubscriptionStore.getState().incrementTaskCount();
    return session.id;
  },

  async resumeSavedTask(saved) {
    const session = await sessionsApi.create(saved.taskId);
    set({
      activeTask: {
        id:           saved.taskId,
        title:        saved.title,
        description:  saved.description,
        tip:          saved.tip,
        category:     saved.category as Task['category'],
        level:        saved.level as Task['level'],
        durationMins: saved.durationMins,
        tags:         saved.tags,
      },
      activeSessionId: session.id,
      previewTask:     null,
      guestTask:       null,
    });
    await useSubscriptionStore.getState().incrementTaskCount();
  },

  async closeSession(status) {
    const { activeSessionId } = get();
    console.log('[closeSession] status:', status, 'sessionId:', activeSessionId);
    if (activeSessionId) {
      await sessionsApi.updateStatus(activeSessionId, status);
      console.log('[closeSession] updateStatus done');
    } else {
      console.warn('[closeSession] no activeSessionId — updateStatus skipped');
    }
    // Clear guest task if any
    await AsyncStorage.removeItem('guest_active_task');
    const swaps = useSubscriptionStore.getState().swapsPerSession();
    set({
      activeTask:      null,
      activeSessionId: null,
      guestTask:       null,
      previewTask:     null,
      swapsLeft:       swaps,
      MAX_SWAPS:       swaps,
    });
  },

  clearPreview: () => set({ previewTask: null }),
  clearError:   () => set({ error: null }),
}));
