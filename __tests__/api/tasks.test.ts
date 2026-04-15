import { tasksApi } from '@/lib/api/tasks';

jest.mock('@/lib/api/client', () => ({
  api: {
    get: jest.fn(),
    defaults: { headers: { common: {} } },
  },
}));

import { api } from '@/lib/api/client';
const mockApi = api as jest.Mocked<typeof api>;

const mockTask = {
  id: 'task-1',
  title: 'Street Geometry',
  description: 'Find geometric patterns in everyday objects.',
  tip: 'Look for repeating shapes.',
  category: 'VISUAL',
  level: 'BEGINNER',
  durationMins: 30,
  tags: ['geometry', 'patterns'],
};

beforeEach(() => {
  jest.clearAllMocks();
  (mockApi.get as jest.Mock).mockResolvedValue({ data: { data: mockTask } });
});

describe('tasksApi', () => {
  describe('getGuestRandom', () => {
    it('calls /tasks/random/guest with correct params', async () => {
      const result = await tasksApi.getGuestRandom({
        locale: 'ru',
        level: 'BEGINNER',
        categories: ['VISUAL'],
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        '/tasks/random/guest',
        expect.objectContaining({
          headers: expect.objectContaining({ 'Accept-Language': 'ru' }),
          params: expect.objectContaining({
            level: 'BEGINNER',
            categories: ['VISUAL'],
            locale: 'RU',
          }),
        }),
      );
      expect(result).toEqual(mockTask);
    });

    it('converts locale to uppercase for params', async () => {
      await tasksApi.getGuestRandom({ locale: 'en', level: 'INTERMEDIATE', categories: ['SOCIAL'] });

      const call = (mockApi.get as jest.Mock).mock.calls[0];
      expect(call[1].params.locale).toBe('EN');
    });

    it('maps LIMITATIONS category to RESTRICTION', async () => {
      await tasksApi.getGuestRandom({ locale: 'ru', level: 'BEGINNER', categories: ['LIMITATIONS'] });

      const call = (mockApi.get as jest.Mock).mock.calls[0];
      expect(call[1].params.categories).toEqual(['RESTRICTION']);
    });

    it('handles multiple categories including LIMITATIONS', async () => {
      await tasksApi.getGuestRandom({
        locale: 'ru',
        level: 'PRO',
        categories: ['VISUAL', 'LIMITATIONS', 'SOCIAL'],
      });

      const call = (mockApi.get as jest.Mock).mock.calls[0];
      expect(call[1].params.categories).toEqual(['VISUAL', 'RESTRICTION', 'SOCIAL']);
    });
  });

  describe('getAuthRandom', () => {
    it('calls /tasks/random with locale header', async () => {
      const result = await tasksApi.getAuthRandom({ locale: 'ru' });

      expect(mockApi.get).toHaveBeenCalledWith(
        '/tasks/random',
        expect.objectContaining({
          headers: expect.objectContaining({ 'Accept-Language': 'ru' }),
        }),
      );
      expect(result).toEqual(mockTask);
    });

    it('does not pass params when no exclude list', async () => {
      await tasksApi.getAuthRandom({ locale: 'en' });

      const call = (mockApi.get as jest.Mock).mock.calls[0];
      expect(call[1].params).toBeUndefined();
    });

    it('passes exclude param as comma-joined string when provided', async () => {
      await tasksApi.getAuthRandom({ locale: 'en', exclude: ['task-1', 'task-2'] });

      const call = (mockApi.get as jest.Mock).mock.calls[0];
      expect(call[1].params).toEqual({ exclude: 'task-1,task-2' });
    });

    it('does not pass params when exclude is empty array', async () => {
      await tasksApi.getAuthRandom({ locale: 'en', exclude: [] });

      const call = (mockApi.get as jest.Mock).mock.calls[0];
      expect(call[1].params).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('calls /tasks/:id with locale header', async () => {
      const result = await tasksApi.getById('task-42', 'ru');

      expect(mockApi.get).toHaveBeenCalledWith(
        '/tasks/task-42',
        expect.objectContaining({
          headers: expect.objectContaining({ 'Accept-Language': 'ru' }),
        }),
      );
      expect(result).toEqual(mockTask);
    });
  });
});
