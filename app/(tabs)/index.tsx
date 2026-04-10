import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { theme } from '@/constants/theme';
import { useTaskStore } from '@/store/task.store';
import { Task } from '@/lib/api/tasks';
import { RegisterSheet } from '@/components/auth/RegisterSheet';
import { JournalEntrySheet } from '@/components/journal/JournalEntrySheet';

// ─── Timer ────────────────────────────────────────────────────────────────────

const TIMER_OPTIONS = [30, 60, 90] as const;

function useTimer() {
  const [active,    setActive]    = useState(false);
  const [seconds,   setSeconds]   = useState(0);
  const [notifId,   setNotifId]   = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (notifId) await Notifications.cancelScheduledNotificationAsync(notifId);
    setActive(false);
    setSeconds(0);
    setNotifId(null);
  }, [notifId]);

  const start = useCallback(async (minutes: number) => {
    await stop();
    const totalSec = minutes * 60;
    setSeconds(totalSec);
    setActive(true);

    // Schedule local notification
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: 'StreetEye', body: `${minutes} мин истекло. Как прошла съёмка?` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: totalSec },
    });
    setNotifId(id);

    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          setActive(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [stop]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const display = active
    ? `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    : '00:00';

  return { active, display, start, stop };
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TaskScreen() {
  const { t } = useTranslation();
  const store = useTaskStore();
  const timer = useTimer();

  const [isGuest,        setIsGuest]        = useState<boolean | null>(null);
  const [showTimer,      setShowTimer]       = useState(false);
  const [showRegSheet, setShowRegSheet] = useState(false);
  const [journalSheet, setJournalSheet] = useState<{
    sessionId: string; taskId: string; taskTitle: string; taskCategory: string;
  } | null>(null);

  // Determine auth state and load initial task
  useEffect(() => {
    (async () => {
      const rt = await SecureStore.getItemAsync('refresh_token');
      setIsGuest(!rt);
      await store.loadInitialTask();
    })();
  }, []);

  // ─── Derived state ──────────────────────────────────────────────────────────
  const activeTask:  Task | null = store.activeTask ?? store.guestTask ?? null;
  const previewTask: Task | null = store.previewTask;

  // Which task to display (preview takes priority in state B flow)
  const displayTask = previewTask ?? activeTask;
  const hasActive   = !!activeTask;
  const hasPreviw   = !!previewTask;

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleGetTask = async () => {
    store.clearPreview();
    await store.fetchPreview();
  };

  const handleTakeTask = async () => {
    if (!previewTask) return;
    if (isGuest) {
      setShowRegSheet(true);
      return;
    }
    try {
      await store.acceptTask(previewTask.id);
    } catch {
      Alert.alert(t('common.error', { defaultValue: 'Ошибка' }), t('auth.errors.generic'));
    }
  };

  const handleComplete = async () => {
    if (isGuest) {
      setShowRegSheet(true);
      return;
    }
    // Capture task data before closing session (closeSession clears it)
    const task = store.activeTask;
    const sessionId = store.activeSessionId;
    if (!task || !sessionId) return;

    await timer.stop();
    try {
      await store.closeSession('COMPLETED');
    } catch {
      // API may fail — still open journal sheet (offline-first)
    }
    // Always open journal entry sheet with captured data
    setJournalSheet({
      sessionId,
      taskId:       task.id,
      taskTitle:    task.title,
      taskCategory: task.category,
    });
  };

  const handleSaveLater = async () => {
    if (isGuest) {
      setShowRegSheet(true);
      return;
    }
    try {
      await store.closeSession('SAVED_FOR_LATER');
    } catch {
      Alert.alert(t('common.error', { defaultValue: 'Ошибка' }), t('auth.errors.generic'));
    }
  };

  const handleAnotherTask = async () => {
    if (store.swapsLeft <= 0) return;
    store.clearPreview();
    await store.fetchPreview();
  };

  const handleRegisterSuccess = () => {
    setShowRegSheet(false);
    // After registration, user needs to verify email. Show info.
    Alert.alert(
      t('registerSheet.checkEmail', { defaultValue: 'Проверьте почту' }),
      t('registerSheet.checkEmailBody', { defaultValue: 'Перейдите по ссылке в письме, затем войдите в аккаунт.' }),
    );
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (isGuest === null || (store.loading && !displayTask)) {
    return (
      <SafeAreaView style={s.container}>
        <Header />
        <View style={s.center}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── State A — active task ─────────────────────────────────────────────────
  if (hasActive && !hasPreviw) {
    return (
      <SafeAreaView style={s.container}>
        <Header />
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Status */}
          <View style={s.statusRow}>
            <View style={s.statusDot} />
            <Text style={s.statusText}>
              {t('task.statusActive', { defaultValue: 'Активное задание' })}
            </Text>
          </View>

          <TaskCard task={activeTask!} />

          {/* Timer */}
          <TimerBlock
            timer={timer}
            show={showTimer}
            onToggle={() => setShowTimer(v => !v)}
          />
        </ScrollView>

        {/* Actions */}
        <View style={s.footer}>
          <TouchableOpacity style={s.btnPrimary} activeOpacity={0.8} onPress={handleComplete}>
            <Ionicons name="checkmark" size={20} color={theme.colors.text} />
            <Text style={s.btnPrimaryText}>{t('task.done')}</Text>
          </TouchableOpacity>
          <View style={s.secondaryRow}>
            <TouchableOpacity onPress={handleSaveLater} hitSlop={8}>
              <Text style={s.linkText}>{t('task.saveLater')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <RegisterSheet
          visible={showRegSheet}
          onClose={() => setShowRegSheet(false)}
          onSuccess={handleRegisterSuccess}
        />

        {journalSheet && (
          <JournalEntrySheet
            visible={!!journalSheet}
            sessionId={journalSheet.sessionId}
            taskId={journalSheet.taskId}
            taskTitle={journalSheet.taskTitle}
            taskCategory={journalSheet.taskCategory}
            onSaved={() => setJournalSheet(null)}
            onSkip={() => setJournalSheet(null)}
          />
        )}
      </SafeAreaView>
    );
  }

  // ─── State B — preview / no task ──────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <Header />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {displayTask ? (
          <>
            {/* Preview mode: show task card */}
            <TaskCard task={displayTask} />

            {/* Swap counter */}
            {store.swapsLeft < store.MAX_SWAPS && (
              <Text style={s.swapCounter}>
                {t('task.attemptsLeft', { count: store.swapsLeft })}
              </Text>
            )}
          </>
        ) : (
          /* Empty state */
          <View style={s.emptyState}>
            <Ionicons name="aperture-outline" size={64} color={theme.colors.iconMuted} />
            <Text style={s.emptyTitle}>
              {t('task.emptyTitle', { defaultValue: 'Нет активного задания' })}
            </Text>
            <Text style={s.emptySubtitle}>
              {t('task.emptySubtitle', { defaultValue: 'Нажмите кнопку, чтобы получить задание' })}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Error */}
      {store.error && (
        <Text style={s.errorText}>
          {store.error === 'RATE_LIMIT_EXCEEDED'
            ? t('auth.errors.rateLimitExceeded')
            : t('auth.errors.generic')}
        </Text>
      )}

      {/* Footer actions */}
      <View style={s.footer}>
        {displayTask ? (
          <>
            {/* "Take this" */}
            {!isGuest ? (
              <TouchableOpacity style={s.btnPrimary} activeOpacity={0.8} onPress={handleTakeTask}>
                <Text style={s.btnPrimaryText}>{t('task.take')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.btnPrimary} activeOpacity={0.8} onPress={() => setShowRegSheet(true)}>
                <Text style={s.btnPrimaryText}>{t('task.take')}</Text>
              </TouchableOpacity>
            )}
            {/* "Another task" */}
            <TouchableOpacity
              style={[s.btnSecondary, store.swapsLeft === 0 && s.btnDisabled]}
              activeOpacity={0.8}
              onPress={handleAnotherTask}
              disabled={store.swapsLeft === 0 || store.loading}
            >
              {store.loading
                ? <ActivityIndicator color={theme.colors.textSecondary} size="small" />
                : <Text style={s.btnSecondaryText}>{t('task.another')}</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          /* "Get task" */
          <TouchableOpacity
            style={[s.btnPrimary, store.loading && s.btnDisabled]}
            activeOpacity={0.8}
            onPress={handleGetTask}
            disabled={store.loading}
          >
            {store.loading
              ? <ActivityIndicator color={theme.colors.text} />
              : <Text style={s.btnPrimaryText}>
                  {t('task.getTask', { defaultValue: 'Получить задание' })}
                </Text>
            }
          </TouchableOpacity>
        )}
      </View>

      <RegisterSheet
        visible={showRegSheet}
        onClose={() => setShowRegSheet(false)}
        onSuccess={handleRegisterSuccess}
      />

      {journalSheet && (
        <JournalEntrySheet
          visible={!!journalSheet}
          sessionId={journalSheet.sessionId}
          taskId={journalSheet.taskId}
          taskTitle={journalSheet.taskTitle}
          taskCategory={journalSheet.taskCategory}
          onSaved={() => setJournalSheet(null)}
          onSkip={() => setJournalSheet(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header() {
  return (
    <View style={s.header}>
      <View style={s.logoRow}>
        <Ionicons name="aperture" size={22} color={theme.colors.accent} />
        <Text style={s.logoText}>StreetEye</Text>
      </View>
    </View>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: Task }) {
  const { t } = useTranslation();
  const [showTip, setShowTip] = useState(false);

  return (
    <View style={s.taskCard}>
      {/* Badges */}
      <View style={s.badges}>
        <View style={s.badgeAccent}>
          <Text style={s.badgeAccentText}>
            {t(`task.categories.${task.category}`, { defaultValue: task.category })}
          </Text>
        </View>
        <View style={s.badgeLevel}>
          <Text style={s.badgeLevelText}>
            {t(`task.levels.${task.level}`, { defaultValue: task.level })}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowTip(v => !v)} hitSlop={8} style={s.tipToggle}>
          <Ionicons
            name={showTip ? 'chevron-up' : 'chevron-forward'}
            size={18}
            color={theme.colors.iconMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={s.taskTitle}>{task.title}</Text>

      {/* Description */}
      <Text style={s.taskDesc}>{task.description}</Text>

      {/* Tip (collapsible) */}
      {showTip && (
        <View style={s.tipRow}>
          <Ionicons name="location-outline" size={16} color={theme.colors.accent} style={{ marginTop: 2 }} />
          <Text style={s.tipText}>{task.tip}</Text>
        </View>
      )}

      {/* Duration */}
      <View style={s.durationRow}>
        <Ionicons name="time-outline" size={15} color={theme.colors.textMuted} />
        <Text style={s.durationText}>{task.durationMins} мин</Text>
      </View>
    </View>
  );
}

// ─── Timer block ──────────────────────────────────────────────────────────────

function TimerBlock({
  timer, show, onToggle,
}: {
  timer: ReturnType<typeof useTimer>;
  show: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={s.timerWrap}>
      <TouchableOpacity style={s.timerRow} onPress={onToggle} activeOpacity={0.7}>
        <Ionicons name="timer-outline" size={18} color={theme.colors.textMuted} />
        <Text style={s.timerLabel}>{t('task.timer', { defaultValue: 'Таймер' })}</Text>
        <Text style={s.timerDisplay}>{timer.display}</Text>
      </TouchableOpacity>

      {show && !timer.active && (
        <View style={s.timerOptions}>
          {TIMER_OPTIONS.map((m) => (
            <TouchableOpacity
              key={m}
              style={s.timerOptionBtn}
              onPress={() => { timer.start(m); onToggle(); }}
              activeOpacity={0.8}
            >
              <Text style={s.timerOptionText}>{m} мин</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {timer.active && (
        <TouchableOpacity style={s.timerStopBtn} onPress={timer.stop} hitSlop={8}>
          <Text style={s.timerStopText}>{t('task.timerStop', { defaultValue: 'Остановить' })}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: theme.colors.bg },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:           { flexGrow: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: 120, gap: theme.spacing.lg },

  // Header
  header:           { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
  logoRow:          { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  logoText:         { ...theme.font.displaySm, fontWeight: '700', color: theme.colors.text, fontFamily: theme.font.family },

  // Status
  statusRow:        { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  statusDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accent },
  statusText:       { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },

  // Task card
  taskCard:         { gap: theme.spacing.md },
  badges:           { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  badgeAccent:      { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  badgeAccentText:  { ...theme.font.bodySmall, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
  badgeLevel:       { backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  badgeLevelText:   { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  tipToggle:        { marginLeft: 'auto' as any },
  taskTitle:        { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family, lineHeight: 36 },
  taskDesc:         { ...theme.font.body, color: theme.colors.textSecondary, fontFamily: theme.font.family, lineHeight: 26 },
  tipRow:           { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start', backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.md, padding: theme.spacing.md },
  tipText:          { ...theme.font.body, color: theme.colors.textSecondary, fontFamily: theme.font.family, flex: 1, lineHeight: 24 },
  durationRow:      { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' },
  durationText:     { ...theme.font.bodySmall, color: theme.colors.textMuted, fontFamily: theme.font.family },

  // Timer
  timerWrap:        { backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, padding: theme.spacing.md, gap: theme.spacing.sm },
  timerRow:         { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  timerLabel:       { ...theme.font.body, color: theme.colors.textMuted, fontFamily: theme.font.family, flex: 1 },
  timerDisplay:     { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family, fontVariant: ['tabular-nums'] as any },
  timerOptions:     { flexDirection: 'row', gap: theme.spacing.sm, paddingTop: theme.spacing.sm },
  timerOptionBtn:   { flex: 1, backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.md, paddingVertical: 10, alignItems: 'center' },
  timerOptionText:  { ...theme.font.bodySmall, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
  timerStopBtn:     { alignSelf: 'flex-start', paddingTop: 2 },
  timerStopText:    { ...theme.font.link, color: '#FF6B6B', fontFamily: theme.font.family },

  // Empty state
  emptyState:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, paddingTop: 80 },
  emptyTitle:       { ...theme.font.displaySm, fontWeight: '600', color: theme.colors.text, textAlign: 'center', fontFamily: theme.font.family },
  emptySubtitle:    { ...theme.font.body, color: theme.colors.textMuted, textAlign: 'center', fontFamily: theme.font.family },

  // Swap counter
  swapCounter:      { ...theme.font.bodySmall, color: theme.colors.textMuted, textAlign: 'center', fontFamily: theme.font.family },

  // Error
  errorText:        { ...theme.font.bodySmall, color: '#FF6B6B', textAlign: 'center', paddingHorizontal: theme.spacing.lg, fontFamily: theme.font.family },

  // Footer
  footer:           { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: theme.spacing.lg, paddingBottom: Platform.OS === 'ios' ? 32 : theme.spacing.lg, paddingTop: theme.spacing.md, gap: theme.spacing.sm, backgroundColor: theme.colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.separator },
  btnPrimary:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56 },
  btnPrimaryText:   { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
  btnSecondary:     { backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.pill, height: 48, alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { ...theme.font.body, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  btnDisabled:      { opacity: 0.4 },
  secondaryRow:     { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.xl },
  linkText:         { ...theme.font.link, color: theme.colors.textSecondary, fontFamily: theme.font.family },
});
