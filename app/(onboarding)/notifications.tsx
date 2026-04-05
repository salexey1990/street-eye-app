import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';

const TOTAL_STEPS = 5;
const STEP = 4;

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleAllow = async () => {
    await Notifications.requestPermissionsAsync();
    router.push('/(onboarding)/first-task' as any);
  };

  const handleSkip = () => {
    router.push('/(onboarding)/first-task' as any);
  };

  return (
    <SafeAreaView style={s.container}>
      <ProgressBar step={STEP} total={TOTAL_STEPS} />

      <View style={s.content}>
        <View style={s.iconWrap}>
          <Ionicons name="notifications-outline" size={44} color={theme.colors.accent} />
        </View>

        <View style={s.text}>
          <Text style={s.title}>{t('onboarding.notifications.title')}</Text>
          <Text style={s.subtitle}>{t('onboarding.notifications.subtitle')}</Text>
        </View>
      </View>

      <View style={s.footer}>
        <TouchableOpacity style={s.btn} activeOpacity={0.8} onPress={handleAllow}>
          <Text style={s.btnText}>{t('onboarding.notifications.allow')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip} hitSlop={12}>
          <Text style={s.skip}>{t('onboarding.notifications.skip')}</Text>
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
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.lg, gap: theme.spacing.xl },
  iconWrap:  { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.bgSurface, alignItems: 'center', justifyContent: 'center' },
  text:      { alignItems: 'center', gap: theme.spacing.sm },
  title:     { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family, textAlign: 'center' },
  subtitle:  { ...theme.font.displaySm, color: theme.colors.textSecondary, fontFamily: theme.font.family, textAlign: 'center', lineHeight: 24 },
  footer:    { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, gap: theme.spacing.lg, alignItems: 'center' },
  btn:       { width: '100%', backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText:   { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
  skip:      { ...theme.font.link, color: theme.colors.textSecondary, fontFamily: theme.font.family },
});
