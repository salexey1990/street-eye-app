import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  PanResponder,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';
import { SavedSession, sessionsApi } from '@/lib/api/sessions';
import { useTaskStore } from '@/store/task.store';
import i18n from '@/lib/i18n';

interface Props {
  onResumed: () => void;
}

function relativeDate(iso: string | null | undefined, t: ReturnType<typeof useTranslation>['t']): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) return '';
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return t('saved.today');
  if (days === 1) return t('saved.yesterday');
  return t('saved.daysAgo', { count: days });
}

export function SavedTasksList({ onResumed }: Props) {
  const { t } = useTranslation();
  const store = useTaskStore();

  const [tasks,    setTasks]    = useState<SavedSession[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<SavedSession | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resuming,  setResuming]  = useState(false);

  const slideAnim = useRef(new Animated.Value(500)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideAnim.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          Animated.timing(slideAnim, { toValue: 500, duration: 220, useNativeDriver: true }).start(() => {
            setSheetOpen(false);
            setSelected(null);
          });
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
        }
      },
    }),
  ).current;

  const load = useCallback(async () => {
    console.log('[SavedTasksList] load() called');
    setLoading(true);
    try {
      const locale = i18n.language as 'ru' | 'en';
      const data = await sessionsApi.getSaved(locale);
      console.log('[SavedTasksList] loaded tasks:', data.length);
      // Deduplicate by session id (guards against Strict Mode double-invoke and server duplicates)
      const seen = new Set<string>();
      const unique = data.filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
      setTasks(unique);
    } catch (e: any) {
      console.error('[SavedTasksList] load error:', e?.message);
      // Silent — section stays hidden on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Sheet open / close ────────────────────────────────────────────────────

  const openSheet = (task: SavedSession) => {
    setSelected(task);
    setSheetOpen(true);
    slideAnim.setValue(500);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  };

  const closeSheet = (then?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: 500,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setSheetOpen(false);
      setSelected(null);
      then?.();
    });
  };

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleResume = async () => {
    if (!selected) return;
    setResuming(true);
    try {
      await store.resumeSavedTask(selected);
      closeSheet(onResumed);
    } catch (e: any) {
      const code = e?.response?.data?.error?.code;
      if (code === 'ACTIVE_SESSION_EXISTS') {
        Alert.alert('', t('saved.errors.activeSessionExists'));
      } else {
        Alert.alert(t('common.error', { defaultValue: 'Ошибка' }), t('auth.errors.generic'));
      }
      setResuming(false);
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    const sessionId = selected.id;
    Alert.alert(
      t('saved.deleteConfirmTitle'),
      '',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('saved.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            closeSheet(async () => {
              try {
                await sessionsApi.updateStatus(sessionId, 'SKIPPED');
                setTasks(prev => prev.filter(s => s.id !== sessionId));
              } catch {
                Alert.alert(
                  t('common.error', { defaultValue: 'Ошибка' }),
                  t('auth.errors.generic'),
                );
              }
            });
          },
        },
      ],
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading || tasks.length === 0) return null;

  return (
    <View style={s.container}>
      {/* Section header */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{t('saved.title')}</Text>
        <Text style={s.sectionCount}>{tasks.length}</Text>
      </View>

      {/* Cards */}
      {tasks.map(task => (
        <TouchableOpacity
          key={task.id}
          style={s.card}
          onPress={() => openSheet(task)}
          activeOpacity={0.7}
        >
          <Text style={s.cardTitle} numberOfLines={1}>{task.title}</Text>
          <View style={s.cardMeta}>
            <Text style={s.cardCategory}>
              {t(`task.categories.${task.category}`, { defaultValue: task.category })}
            </Text>
            <Text style={s.cardDate}>{relativeDate(task.completedAt ?? task.startedAt, t)}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Task detail bottom sheet */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => closeSheet()}
      >
        <View style={s.overlay}>
          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={() => closeSheet()}>
            <View style={s.backdrop} />
          </TouchableWithoutFeedback>

          {/* Sheet */}
          <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={s.handle} {...panResponder.panHandlers} hitSlop={{ top: 16, bottom: 16, left: 60, right: 60 }} />

            {selected && (
              <>
                <ScrollView
                  style={s.sheetScroll}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {/* Badges */}
                  <View style={s.badges}>
                    <View style={s.badgeAccent}>
                      <Text style={s.badgeAccentText}>
                        {t(`task.categories.${selected.category}`, { defaultValue: selected.category })}
                      </Text>
                    </View>
                    <View style={s.badgeLevel}>
                      <Text style={s.badgeLevelText}>
                        {t(`task.levels.${selected.level}`, { defaultValue: selected.level })}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.sheetTitle}>{selected.title}</Text>
                  <Text style={s.sheetDesc}>{selected.description}</Text>

                  {!!selected.tip && (
                    <View style={s.tipRow}>
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={theme.colors.accent}
                        style={{ marginTop: 2 }}
                      />
                      <Text style={s.tipText}>{selected.tip}</Text>
                    </View>
                  )}
                </ScrollView>

                {/* Actions */}
                <View style={s.sheetActions}>
                  <TouchableOpacity
                    style={[s.btnPrimary, resuming && s.btnDisabled]}
                    activeOpacity={0.8}
                    onPress={handleResume}
                    disabled={resuming}
                  >
                    {resuming
                      ? <ActivityIndicator color={theme.colors.text} />
                      : <Text style={s.btnPrimaryText}>{t('task.take')}</Text>
                    }
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.btnDelete}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                    disabled={resuming}
                  >
                    <Text style={s.btnDeleteText}>{t('saved.delete')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:      { gap: theme.spacing.sm },

  // Section header
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.xs },
  sectionTitle:   { ...theme.font.label, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  sectionCount:   { ...theme.font.bodySmall, color: theme.colors.textMuted, fontFamily: theme.font.family },

  // Card
  card:           { backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.md, padding: theme.spacing.md, gap: theme.spacing.xs },
  cardTitle:      { ...theme.font.body, color: theme.colors.text, fontFamily: theme.font.family },
  cardMeta:       { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  cardCategory:   { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  cardDate:       { ...theme.font.bodySmall, color: theme.colors.textMuted, fontFamily: theme.font.family, marginLeft: 'auto' as any },

  // Modal overlay
  overlay:        { flex: 1, justifyContent: 'flex-end' },
  backdrop:       { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },

  // Sheet
  sheet:          { backgroundColor: theme.colors.bgSurface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: Platform.OS === 'ios' ? 36 : theme.spacing.lg, maxHeight: '80%' },
  handle:         { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.separator, alignSelf: 'center', marginTop: theme.spacing.sm, marginBottom: theme.spacing.md },
  sheetScroll:    { paddingHorizontal: theme.spacing.lg },

  // Sheet content
  badges:         { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  badgeAccent:    { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  badgeAccentText:{ ...theme.font.bodySmall, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
  badgeLevel:     { backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  badgeLevelText: { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  sheetTitle:     { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family, lineHeight: 36, marginBottom: theme.spacing.sm },
  sheetDesc:      { ...theme.font.body, color: theme.colors.textSecondary, fontFamily: theme.font.family, lineHeight: 26, marginBottom: theme.spacing.md },
  tipRow:         { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start', backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.lg },
  tipText:        { ...theme.font.body, color: theme.colors.textSecondary, fontFamily: theme.font.family, flex: 1, lineHeight: 24 },

  // Sheet actions
  sheetActions:   { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md },
  btnPrimary:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56 },
  btnPrimaryText: { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
  btnDisabled:    { opacity: 0.4 },
  btnDelete:      { alignItems: 'center', paddingVertical: theme.spacing.sm },
  btnDeleteText:  { ...theme.font.link, color: '#FF453A', fontFamily: theme.font.family },
});
