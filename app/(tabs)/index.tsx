import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';
import { Task } from '@/lib/api/tasks';

export default function TaskScreen() {
  const { t } = useTranslation();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveTask();
  }, []);

  const loadActiveTask = async () => {
    try {
      const raw = await AsyncStorage.getItem('guest_active_task');
      if (raw) {
        setTask(JSON.parse(raw));
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Ionicons name="aperture" size={64} color={theme.colors.accent} />
          <Text style={s.emptyTitle}>{t('task.empty', { defaultValue: 'Нет активного задания' })}</Text>
          <TouchableOpacity style={s.btn} activeOpacity={0.8}>
            <Text style={s.btnText}>{t('task.getTask', { defaultValue: 'Получить задание' })}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
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
        </View>

        <Text style={s.taskTitle}>{task.title}</Text>
        <Text style={s.taskDesc}>{task.description}</Text>

        <View style={s.tip}>
          <Ionicons name="location-outline" size={16} color={theme.colors.accent} style={{ marginTop: 2 }} />
          <Text style={s.tipText}>{task.tip}</Text>
        </View>

        <View style={s.duration}>
          <Ionicons name="time-outline" size={15} color={theme.colors.textMuted} />
          <Text style={s.durationText}>
            {t('onboarding.firstTask.recommended', { minutes: task.durationMins })}
          </Text>
        </View>
      </View>

      <View style={s.footer}>
        <TouchableOpacity style={s.btn} activeOpacity={0.8}>
          <Text style={s.btnText}>{t('task.done')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSecondary} activeOpacity={0.8}>
          <Text style={s.btnSecondaryText}>{t('task.saveLater')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: theme.colors.bg },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg, paddingHorizontal: theme.spacing.lg },
  content:         { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl, gap: theme.spacing.lg },
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
  emptyTitle:      { ...theme.font.displaySm, color: theme.colors.textSecondary, textAlign: 'center', fontFamily: theme.font.family },
  footer:          { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, gap: theme.spacing.sm },
  btn:             { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText:         { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
  btnSecondary:    { backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText:{ ...theme.font.button, color: theme.colors.textSecondary, fontFamily: theme.font.family },
});
