import { api } from './client';
import i18n from '@/lib/i18n';

export type SelfRating = 'FAILED' | 'PARTIAL' | 'SUCCESS';

export interface JournalEntryApi {
  id:         string;
  sessionId:  string;
  category:   string;
  level:      string;
  note:       string | null;
  selfRating: SelfRating;
  hasPhoto:   boolean;
  createdAt:  string;
  updatedAt:  string;
}

export interface JournalStats {
  totalCompleted: number;
  totalSkipped:   number;
  currentStreak:  number;
  longestStreak:  number;
  byCategory:     Record<string, number>;
  byRating:       Record<SelfRating, number>;
}

export const journalApi = {
  async create(dto: {
    sessionId:  string;
    selfRating: SelfRating;
    note?:      string | null;
    hasPhoto?:  boolean;
  }): Promise<JournalEntryApi> {
    const res = await api.post('/journal', dto, {
      headers: { 'Accept-Language': i18n.language },
    });
    return res.data.data;
  },

  async getAll(params?: {
    category?:   string;
    selfRating?: SelfRating;
    limit?:      number;
    cursor?:     string;
  }): Promise<{ items: JournalEntryApi[]; nextCursor: string | null; hasMore: boolean }> {
    const res = await api.get('/journal', {
      headers: { 'Accept-Language': i18n.language },
      params,
    });
    return res.data.data;
  },

  async getStats(): Promise<JournalStats> {
    const res = await api.get('/journal/stats', {
      headers: { 'Accept-Language': i18n.language },
    });
    return res.data.data;
  },

  async update(id: string, dto: {
    note?:       string | null;
    selfRating?: SelfRating;
    hasPhoto?:   boolean;
  }): Promise<JournalEntryApi> {
    const res = await api.patch(`/journal/${id}`, dto, {
      headers: { 'Accept-Language': i18n.language },
    });
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/journal/${id}`, {
      headers: { 'Accept-Language': i18n.language },
    });
  },
};
