import { api } from './client';

// Shape returned by POST /sessions and PATCH /sessions/:id
export interface Session {
  id:          string; // session ID
  status:      'ACTIVE' | 'COMPLETED' | 'SKIPPED' | 'SAVED_FOR_LATER';
  startedAt:   string;
  completedAt: string | null;
}

// Flat view of GET /sessions/active — task fields lifted to top level
export interface ActiveSession {
  sessionId:   string; // session ID  (API: data.id)
  id:          string; // task ID     (API: data.task.id)
  title:       string;
  description: string;
  tip:         string;
  category:    string;
  level:       string;
  durationMins:number;
  tags:        string[];
  startedAt:   string;
}

// Flat view of GET /sessions items — task fields lifted to top level
export interface SavedSession {
  id:          string; // session ID  (API: item.id)
  taskId:      string; // task ID     (API: item.task.id)
  title:       string;
  description: string;
  tip:         string;
  category:    string;
  level:       string;
  durationMins:number;
  tags:        string[];
  startedAt:   string;
  completedAt: string | null;
}

export const sessionsApi = {
  async create(taskId: string): Promise<Session> {
    const res = await api.post('/sessions', { taskId });
    const d = res.data.data;
    return { id: d.id, status: d.status, startedAt: d.startedAt, completedAt: d.completedAt };
  },

  async updateStatus(
    id: string,
    status: 'COMPLETED' | 'SKIPPED' | 'SAVED_FOR_LATER',
  ): Promise<Session> {
    const res = await api.patch(`/sessions/${id}`, { status });
    const d = res.data.data;
    return { id: d.id, status: d.status, startedAt: d.startedAt, completedAt: d.completedAt };
  },

  async getActive(locale: 'ru' | 'en'): Promise<ActiveSession | null> {
    try {
      const res = await api.get('/sessions/active', {
        headers: { 'Accept-Language': locale },
      });
      const d = res.data.data;
      return {
        sessionId:   d.id,
        id:          d.task.id,
        title:       d.task.title,
        description: d.task.description,
        tip:         d.task.tip,
        category:    d.task.category,
        level:       d.task.level,
        durationMins:d.task.durationMins,
        tags:        d.task.tags,
        startedAt:   d.startedAt,
      };
    } catch (e: any) {
      if (e?.response?.status === 404) return null;
      throw e;
    }
  },

  async getSaved(locale: 'ru' | 'en'): Promise<SavedSession[]> {
    try {
      const res = await api.get('/sessions', {
        params: { status: 'SAVED_FOR_LATER', limit: 10 },
        headers: { 'Accept-Language': locale },
      });
      console.log('[getSaved] raw response data:', JSON.stringify(res.data));
      const raw = res.data.data;
      // Handle both paginated { items: [] } and flat array responses
      const items: any[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
      console.log('[getSaved] items count:', items.length);
      return items.map(item => ({
        id:          item.id,
        taskId:      item.task.id,
        title:       item.task.title,
        description: item.task.description,
        tip:         item.task.tip,
        category:    item.task.category,
        level:       item.task.level,
        durationMins:item.task.durationMins,
        tags:        item.task.tags,
        startedAt:   item.startedAt,
        completedAt: item.completedAt,
      }));
    } catch (e: any) {
      console.error('[getSaved] error:', e?.response?.status, e?.response?.data ?? e?.message);
      return [];
    }
  },
};
