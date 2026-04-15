import { sessionsApi } from '@/lib/api/sessions';

jest.mock('@/lib/api/client', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    defaults: { headers: { common: {} } },
  },
}));

import { api } from '@/lib/api/client';
const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('sessionsApi', () => {
  describe('create', () => {
    it('posts to /sessions and maps response', async () => {
      (mockApi.post as jest.Mock).mockResolvedValueOnce({
        data: {
          data: {
            id: 'sess-1',
            status: 'ACTIVE',
            startedAt: '2024-01-01T10:00:00Z',
            completedAt: null,
          },
        },
      });

      const result = await sessionsApi.create('task-abc');

      expect(mockApi.post).toHaveBeenCalledWith('/sessions', { taskId: 'task-abc' });
      expect(result).toEqual({
        id: 'sess-1',
        status: 'ACTIVE',
        startedAt: '2024-01-01T10:00:00Z',
        completedAt: null,
      });
    });
  });

  describe('updateStatus', () => {
    it('patches session status', async () => {
      (mockApi.patch as jest.Mock).mockResolvedValueOnce({
        data: {
          data: {
            id: 'sess-2',
            status: 'COMPLETED',
            startedAt: '2024-01-01T10:00:00Z',
            completedAt: '2024-01-01T11:00:00Z',
          },
        },
      });

      const result = await sessionsApi.updateStatus('sess-2', 'COMPLETED');

      expect(mockApi.patch).toHaveBeenCalledWith('/sessions/sess-2', { status: 'COMPLETED' });
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('getActive', () => {
    it('returns active session with lifted task fields', async () => {
      (mockApi.get as jest.Mock).mockResolvedValueOnce({
        data: {
          data: {
            id: 'sess-3',
            task: {
              id: 'task-5',
              title: 'Look up',
              description: 'Observe rooftops',
              tip: 'Use shadows',
              category: 'VISUAL',
              level: 'BEGINNER',
              durationMins: 30,
              tags: ['rooftop'],
            },
            startedAt: '2024-01-01T10:00:00Z',
          },
        },
      });

      const result = await sessionsApi.getActive('ru');

      expect(result).not.toBeNull();
      expect(result!.sessionId).toBe('sess-3');
      expect(result!.id).toBe('task-5');
      expect(result!.title).toBe('Look up');
      expect(result!.tags).toEqual(['rooftop']);
    });

    it('returns null on 404', async () => {
      (mockApi.get as jest.Mock).mockRejectedValueOnce({ response: { status: 404 } });

      const result = await sessionsApi.getActive('en');

      expect(result).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      (mockApi.get as jest.Mock).mockRejectedValueOnce({ response: { status: 500 } });

      await expect(sessionsApi.getActive('ru')).rejects.toMatchObject({ response: { status: 500 } });
    });
  });

  describe('getSaved', () => {
    it('maps paginated response with items array', async () => {
      const item = {
        id: 'sess-10',
        task: {
          id: 'task-10',
          title: 'Shadows',
          description: 'Play with shadows',
          tip: 'Midday light',
          category: 'VISUAL',
          level: 'INTERMEDIATE',
          durationMins: 45,
          tags: ['shadow', 'light'],
        },
        startedAt: '2024-01-02T08:00:00Z',
        completedAt: null,
      };
      (mockApi.get as jest.Mock).mockResolvedValueOnce({
        data: { data: { items: [item] } },
      });

      const result = await sessionsApi.getSaved('en');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sess-10');
      expect(result[0].taskId).toBe('task-10');
      expect(result[0].title).toBe('Shadows');
    });

    it('handles flat array response format', async () => {
      const item = {
        id: 'sess-11',
        task: {
          id: 'task-11',
          title: 'Flat array task',
          description: 'desc',
          tip: 'tip',
          category: 'SOCIAL',
          level: 'PRO',
          durationMins: 60,
          tags: [],
        },
        startedAt: '2024-01-03T08:00:00Z',
        completedAt: null,
      };
      (mockApi.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [item] },
      });

      const result = await sessionsApi.getSaved('ru');

      expect(result).toHaveLength(1);
      expect(result[0].taskId).toBe('task-11');
    });

    it('returns empty array on error', async () => {
      (mockApi.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await sessionsApi.getSaved('ru');

      expect(result).toEqual([]);
    });
  });
});
