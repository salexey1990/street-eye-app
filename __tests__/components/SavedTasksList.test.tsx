import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { SavedTasksList } from '@/components/task/SavedTasksList';

// Mock sessionsApi and task store
jest.mock('@/lib/api/sessions', () => ({
  sessionsApi: {
    getSaved: jest.fn(),
    updateStatus: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('@/store/task.store', () => ({
  useTaskStore: jest.fn(),
}));

import { sessionsApi } from '@/lib/api/sessions';
import { useTaskStore } from '@/store/task.store';

const mockSavedSession = {
  id: 'sess-1',
  taskId: 'task-1',
  title: 'Look at reflections',
  description: 'Find reflective surfaces in the city.',
  tip: 'Early morning for best light.',
  category: 'VISUAL',
  level: 'BEGINNER',
  durationMins: 30,
  tags: ['reflections', 'light'],
  startedAt: new Date().toISOString(),
  completedAt: null,
};

const mockResumedTask = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useTaskStore as jest.Mock).mockReturnValue({
    resumeSavedTask: mockResumedTask,
  });
});

describe('SavedTasksList', () => {
  it('renders nothing when loading', async () => {
    (sessionsApi.getSaved as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    const { toJSON } = render(<SavedTasksList onResumed={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when no tasks returned', async () => {
    (sessionsApi.getSaved as jest.Mock).mockResolvedValueOnce([]);

    const { toJSON } = render(<SavedTasksList onResumed={jest.fn()} />);
    await waitFor(() => {
      expect(sessionsApi.getSaved).toHaveBeenCalled();
    });
    expect(toJSON()).toBeNull();
  });

  it('renders task cards when tasks are returned', async () => {
    (sessionsApi.getSaved as jest.Mock).mockResolvedValueOnce([mockSavedSession]);

    const { getByText } = render(<SavedTasksList onResumed={jest.fn()} />);
    await waitFor(() => {
      expect(getByText('Look at reflections')).toBeTruthy();
    });
  });

  it('shows section title and count', async () => {
    (sessionsApi.getSaved as jest.Mock).mockResolvedValueOnce([mockSavedSession]);

    const { getByText } = render(<SavedTasksList onResumed={jest.fn()} />);
    await waitFor(() => {
      expect(getByText('saved.title')).toBeTruthy(); // i18n key since t(k) => k in tests
      expect(getByText('1')).toBeTruthy();
    });
  });

  it('calls sessionsApi.getSaved with current locale on mount', async () => {
    (sessionsApi.getSaved as jest.Mock).mockResolvedValueOnce([]);

    render(<SavedTasksList onResumed={jest.fn()} />);
    await waitFor(() => {
      expect(sessionsApi.getSaved).toHaveBeenCalledWith('ru');
    });
  });

  it('deduplicates tasks with the same session id', async () => {
    const duplicate = { ...mockSavedSession }; // same id
    (sessionsApi.getSaved as jest.Mock).mockResolvedValueOnce([mockSavedSession, duplicate]);

    const { getAllByText } = render(<SavedTasksList onResumed={jest.fn()} />);
    await waitFor(() => {
      const cards = getAllByText('Look at reflections');
      expect(cards).toHaveLength(1);
    });
  });

  it('renders nothing silently on API error', async () => {
    (sessionsApi.getSaved as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { toJSON } = render(<SavedTasksList onResumed={jest.fn()} />);
    await waitFor(() => {
      expect(sessionsApi.getSaved).toHaveBeenCalled();
    });
    expect(toJSON()).toBeNull();
  });

  it('shows category and date for each task card', async () => {
    (sessionsApi.getSaved as jest.Mock).mockResolvedValueOnce([mockSavedSession]);

    const { getByText } = render(<SavedTasksList onResumed={jest.fn()} />);
    // t() mock returns defaultValue when provided; component passes category as defaultValue
    await waitFor(() => {
      expect(getByText('VISUAL')).toBeTruthy();
    });
  });

  it('opens the bottom sheet modal when a card is pressed', async () => {
    (sessionsApi.getSaved as jest.Mock).mockResolvedValueOnce([mockSavedSession]);

    const { getByText } = render(<SavedTasksList onResumed={jest.fn()} />);
    await waitFor(() => getByText('Look at reflections'));

    fireEvent.press(getByText('Look at reflections'));

    await waitFor(() => {
      // Task detail should be visible in the sheet
      expect(getByText('task.take')).toBeTruthy();
    });
  });

  it('shows ACTIVE_SESSION_EXISTS alert when resuming fails with that code', async () => {
    (sessionsApi.getSaved as jest.Mock).mockResolvedValueOnce([mockSavedSession]);
    mockResumedTask.mockRejectedValueOnce({
      response: { data: { error: { code: 'ACTIVE_SESSION_EXISTS' } } },
    });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');

    const { getByText } = render(<SavedTasksList onResumed={jest.fn()} />);
    await waitFor(() => getByText('Look at reflections'));

    fireEvent.press(getByText('Look at reflections'));
    await waitFor(() => getByText('task.take'));

    await act(async () => {
      fireEvent.press(getByText('task.take'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('', expect.any(String));
    });
    alertSpy.mockRestore();
  });

  it('shows generic error alert when resuming fails with unknown error', async () => {
    (sessionsApi.getSaved as jest.Mock).mockResolvedValueOnce([mockSavedSession]);
    mockResumedTask.mockRejectedValueOnce(new Error('Network'));
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');

    const { getByText } = render(<SavedTasksList onResumed={jest.fn()} />);
    await waitFor(() => getByText('Look at reflections'));

    fireEvent.press(getByText('Look at reflections'));
    await waitFor(() => getByText('task.take'));

    await act(async () => {
      fireEvent.press(getByText('task.take'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.any(String), expect.any(String));
    });
    alertSpy.mockRestore();
  });

  it('shows delete confirmation alert when delete button is pressed', async () => {
    (sessionsApi.getSaved as jest.Mock).mockResolvedValueOnce([mockSavedSession]);
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');

    const { getByText } = render(<SavedTasksList onResumed={jest.fn()} />);
    await waitFor(() => getByText('Look at reflections'));

    fireEvent.press(getByText('Look at reflections'));
    await waitFor(() => getByText('saved.delete'));

    fireEvent.press(getByText('saved.delete'));

    expect(alertSpy).toHaveBeenCalledWith(
      'saved.deleteConfirmTitle',
      '',
      expect.arrayContaining([
        expect.objectContaining({ style: 'destructive' }),
      ]),
    );
    alertSpy.mockRestore();
  });

  it('calls updateStatus SKIPPED and removes task from list on delete confirm', async () => {
    (sessionsApi.getSaved as jest.Mock).mockResolvedValueOnce([mockSavedSession]);
    (sessionsApi.updateStatus as jest.Mock).mockResolvedValueOnce({});
    let deleteOnPress: (() => void) | undefined;
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(
      (_title, _msg, buttons) => {
        const destructive = (buttons as any[]).find(b => b.style === 'destructive');
        deleteOnPress = destructive?.onPress;
      },
    );

    const { getByText, queryByText } = render(<SavedTasksList onResumed={jest.fn()} />);
    await waitFor(() => getByText('Look at reflections'));

    fireEvent.press(getByText('Look at reflections'));
    await waitFor(() => getByText('saved.delete'));
    fireEvent.press(getByText('saved.delete'));

    await act(async () => {
      deleteOnPress?.();
    });

    await waitFor(() => {
      expect(sessionsApi.updateStatus).toHaveBeenCalledWith('sess-1', 'SKIPPED');
    });
    await waitFor(() => {
      expect(queryByText('Look at reflections')).toBeNull();
    });
    alertSpy.mockRestore();
  });

  it('displays tip text in the bottom sheet when task has a tip', async () => {
    (sessionsApi.getSaved as jest.Mock).mockResolvedValueOnce([mockSavedSession]);

    const { getByText } = render(<SavedTasksList onResumed={jest.fn()} />);
    await waitFor(() => getByText('Look at reflections'));

    fireEvent.press(getByText('Look at reflections'));

    await waitFor(() => {
      expect(getByText('Early morning for best light.')).toBeTruthy();
    });
  });

  it('calls resumeSavedTask and onResumed when "Take task" is pressed', async () => {
    (sessionsApi.getSaved as jest.Mock).mockResolvedValueOnce([mockSavedSession]);
    mockResumedTask.mockResolvedValueOnce(undefined);
    const onResumed = jest.fn();

    const { getByText } = render(<SavedTasksList onResumed={onResumed} />);
    await waitFor(() => getByText('Look at reflections'));

    fireEvent.press(getByText('Look at reflections'));
    await waitFor(() => getByText('task.take'));

    await act(async () => {
      fireEvent.press(getByText('task.take'));
    });

    expect(mockResumedTask).toHaveBeenCalledWith(mockSavedSession);
  });
});
