import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { journalDb, JournalEntry, SelfRating } from '@/lib/db/journal';
import { journalApi, JournalStats } from '@/lib/api/journal';
import { useAuthStore } from '@/store/auth.store';

function currentUserId(): string {
  return useAuthStore.getState().userId ?? '';
}

interface JournalState {
  entries: JournalEntry[];
  stats:   JournalStats | null;
  loading: boolean;

  load:          () => Promise<void>;
  syncPending:   () => Promise<void>;
  createEntry:   (data: {
    sessionId:    string;
    taskId:       string;
    taskTitle:    string;
    taskCategory: string;
    selfRating:   SelfRating;
    note?:        string | null;
    photoUri?:    string | null;
  }) => Promise<JournalEntry>;
  updateEntry:   (id: string, patch: {
    note?:       string | null;
    selfRating?: SelfRating;
    photoUri?:   string | null;
  }) => Promise<void>;
  deleteEntry:   (id: string) => Promise<void>;
  clear:         () => void;
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  stats:   null,
  loading: false,

  async load() {
    set({ loading: true });
    const userId = currentUserId();
    try {
      // Re-claim entries that were saved before user_id tracking was added
      // (they have user_id=''). Must run before getAll so they're visible.
      if (userId) await journalDb.claimOrphaned(userId);

      // Always read from SQLite first (offline support)
      const local = await journalDb.getAll(userId);
      set({ entries: local });

      // Fetch remote if authenticated
      const rt = await SecureStore.getItemAsync('refresh_token');
      if (rt) {
        const [remote, stats] = await Promise.all([
          journalApi.getAll({ limit: 50 }).catch(() => null),
          journalApi.getStats().catch(() => null),
        ]);
        if (stats) set({ stats });
        // Upsert remote entries into SQLite (they may not be local yet)
        if (remote?.items?.length) {
          for (const e of remote.items) {
            const exists = await journalDb.getById(e.id);
            if (!exists) {
              await journalDb.insert({
                id:            e.id,
                session_id:    e.sessionId,
                task_id:       '',
                task_title:    '',
                task_category: e.category,
                note:          e.note,
                self_rating:   e.selfRating,
                has_photo:     e.hasPhoto,
                photo_uri:     null,
                created_at:    e.createdAt,
                user_id:       userId,
              });
              await journalDb.markSynced(e.id);
            }
          }
          const updated = await journalDb.getAll(userId);
          set({ entries: updated });
        }
      }
    } finally {
      set({ loading: false });
    }
  },

  async syncPending() {
    const rt = await SecureStore.getItemAsync('refresh_token');
    if (!rt) return;

    const pending = await journalDb.getPending(currentUserId());
    for (const entry of pending) {
      try {
        await journalApi.create({
          sessionId:  entry.session_id,
          selfRating: entry.self_rating,
          note:       entry.note,
          hasPhoto:   entry.has_photo,
        });
        await journalDb.markSynced(entry.id);
      } catch {
        // Keep as unsynced, retry next time
      }
    }
  },

  async createEntry({ sessionId, taskId, taskTitle, taskCategory, selfRating, note, photoUri }) {
    const id = Crypto.randomUUID();
    const created_at = new Date().toISOString();

    const entry: JournalEntry = {
      id,
      session_id:    sessionId,
      task_id:       taskId,
      task_title:    taskTitle,
      task_category: taskCategory,
      note:          note ?? null,
      self_rating:   selfRating,
      has_photo:     !!photoUri,
      photo_uri:     photoUri ?? null,
      created_at,
      user_id:       currentUserId(),
      synced:        false,
    };

    // 1. Save locally first
    await journalDb.insert(entry);
    set((s) => ({ entries: [entry, ...s.entries] }));

    // 2. Try to sync to API
    const rt = await SecureStore.getItemAsync('refresh_token');
    if (rt) {
      try {
        const remote = await journalApi.create({
          sessionId,
          selfRating,
          note:     note ?? undefined,
          hasPhoto: !!photoUri,
        });
        // Replace local ID with server ID
        await journalDb.delete(id);
        const serverEntry: JournalEntry = { ...entry, id: remote.id, synced: true };
        await journalDb.insert(serverEntry);
        await journalDb.markSynced(remote.id);
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? serverEntry : e)),
        }));
        return serverEntry;
      } catch {
        // stays local with synced=0
      }
    }
    return entry;
  },

  async updateEntry(id, patch) {
    await journalDb.update(id, {
      note:        patch.note,
      self_rating: patch.selfRating,
      has_photo:   patch.photoUri !== undefined ? !!patch.photoUri : undefined,
      photo_uri:   patch.photoUri,
    });
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === id
          ? {
              ...e,
              note:      patch.note !== undefined ? patch.note : e.note,
              self_rating: patch.selfRating ?? e.self_rating,
              has_photo: patch.photoUri !== undefined ? !!patch.photoUri : e.has_photo,
              photo_uri: patch.photoUri !== undefined ? patch.photoUri : e.photo_uri,
              synced:    false,
            }
          : e,
      ),
    }));

    const rt = await SecureStore.getItemAsync('refresh_token');
    if (rt) {
      try {
        await journalApi.update(id, {
          note:        patch.note ?? undefined,
          selfRating:  patch.selfRating,
          hasPhoto:    patch.photoUri !== undefined ? !!patch.photoUri : undefined,
        });
        await journalDb.markSynced(id);
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, synced: true } : e)),
        }));
      } catch { /* stays unsynced */ }
    }
  },

  async deleteEntry(id) {
    await journalDb.delete(id);
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    const rt = await SecureStore.getItemAsync('refresh_token');
    if (rt) {
      journalApi.delete(id).catch(() => {});
    }
  },

  clear() {
    set({ entries: [], stats: null, loading: false });
  },
}));
