import { api } from './client';

export interface Session {
  id:          string;
  taskId:      string;
  status:      'ACTIVE' | 'COMPLETED' | 'SKIPPED' | 'SAVED_FOR_LATER';
  startedAt:   string;
  completedAt: string | null;
}

export interface ActiveSession {
  sessionId:   string;
  id:          string;
  title:       string;
  description: string;
  tip:         string;
  category:    string;
  level:       string;
  durationMins:number;
  tags:        string[];
  startedAt:   string;
}

export const sessionsApi = {
  async create(taskId: string): Promise<Session> {
    const res = await api.post('/sessions', { taskId });
    return res.data.data;
  },

  async updateStatus(
    id: string,
    status: 'COMPLETED' | 'SKIPPED' | 'SAVED_FOR_LATER',
  ): Promise<Session> {
    const res = await api.patch(`/sessions/${id}`, { status });
    return res.data.data;
  },

  async getActive(locale: 'ru' | 'en'): Promise<ActiveSession | null> {
    try {
      const res = await api.get('/sessions/active', {
        headers: { 'Accept-Language': locale },
      });
      return res.data.data;
    } catch (e: any) {
      if (e?.response?.status === 404) return null;
      throw e;
    }
  },
};
