import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';
import { tasksApi, Task } from '@/lib/api/tasks';

const TOTAL_STEPS = 5;
const STEP = 5;

export default function FirstTask() {
  const router = useRouter();
  const { t } = useTranslation();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTask();
  }, []);

  const loadTask = async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await AsyncStorage.getItem('onboarding_data');
      const { level = 'BEGINNER', preferredCategories = ['VISUAL'], locale = 'ru' } = raw ? JSON.parse(raw) : {};
      const data = await tasksApi.getGuestRandom({ level, categories: preferredCategories, locale });
      setTask(data);
    } catch (e: any) {
      const code = e?.response?.data?.error?.code;
      if (code === 'RATE_LIMIT_EXCEEDED') {
        setError(t('auth.errors.rateLimitExceeded'));
      } else if (e?.response) {
        setError(t('auth.errors.generic'));
      } else {
        setError(t('auth.errors.noConnection'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    if (task) {
      await AsyncStorage.setItem('guest_active_task', JSON.stringify(task));
    }
    router.replace('/(tabs)' as any);
  };

  return (
    <SafeAreaView style={s.container}>
      <ProgressBar step={STEP} total={TOTAL_STEPS} />

      <View style={s.content}>
        <View style={s.heading}>
          <Text style={s.title}>{t('onboarding.firstTask.title')}</Text>
          <Text style={s.subtitle}>{t('onboarding.firstTask.subtitle')}</Text>
        </View>

        {loading ? (
          <View style={s.loader}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} activeOpacity={0.8} onPress={loadTask}>
              <Text style={s.retryText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : task ? (
          <View style={s.card}>
            <View style={s.badges}>
              <View style={s.badgeAccent}>
                <Text style={s.badgeAccentText}>{t(`task.categories.${task.category}`, { defaultValue: task.category })}</Text>
              </View>
              <View style={s.badgeLevel}>
                <Text style={s.badgeLevelText}>{t(`task.levels.${task.level}`, { defaultValue: task.level })}</Text>
              </View>
            </View>

            <Text style={s.taskTitle}>{task.title}</Text>
            <Text style={s.taskDesc}>{task.description}</Text>

            <View style={s.tip}>
              <Ionicons name="location-outline" size={16} color={theme.colors.accent} style={{ marginTop: 2 }} />
              <Text style={s.tipText}>{task.tip}</Text>
            </View>

            <View style={s.duration}>
              <Ionicons name="time-outline" size={15} color={theme.colors.textMuted} />
              <Text style={s.durationText}>{t('onboarding.firstTask.recommended', { minutes: task.durationMins })}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={s.footer}>
        <TouchableOpacity style={s.btn} activeOpacity={0.8} onPress={handleStart}>
          <Text style={s.btnText}>{t('onboarding.firstTask.start')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={p.bar}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[p.seg, i < step && p.segActive]} />
      ))}
    </View>
  );
}

const p = StyleSheet.create({
  bar:       { flexDirection: 'row', gap: 4, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md },
  seg:       { flex: 1, height: 3, borderRadius: 2, backgroundColor: theme.colors.bgElevated },
  segActive: { backgroundColor: theme.colors.accent },
});

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: theme.colors.bg },
  content:         { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl, gap: theme.spacing.xl },
  heading:         { gap: theme.spacing.xs },
  title:           { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family },
  subtitle:        { ...theme.font.displaySm, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  loader:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card:            { backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md },
  badges:          { flexDirection: 'row', gap: theme.spacing.sm },
  badgeAccent:     { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  badgeAccentText: { ...theme.font.bodySmall, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
  badgeLevel:      { backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  badgeLevelText:  { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  taskTitle:       { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family },
  taskDesc:        { ...theme.font.body, color: theme.colors.textSecondary, fontFamily: theme.font.family, lineHeight: 24 },
  tip:             { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' },
  tipText:         { ...theme.font.body, color: theme.colors.textSecondary, fontFamily: theme.font.family, flex: 1, lineHeight: 24 },
  duration:        { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' },
  durationText:    { ...theme.font.bodySmall, color: theme.colors.textMuted, fontFamily: theme.font.family },
  errorBox:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg },
  errorText:       { ...theme.font.body, color: '#FF6B6B', textAlign: 'center', fontFamily: theme.font.family },
  retryBtn:        { backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.sm },
  retryText:       { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
  footer:          { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg },
  btn:             { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText:         { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
});
