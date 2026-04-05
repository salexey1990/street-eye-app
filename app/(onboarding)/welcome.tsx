import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';

export default function Welcome() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={s.container}>
      <View style={s.center}>
        <Ionicons name="aperture" size={80} color={theme.colors.accent} />
        <Text style={s.logo}>StreetEye</Text>
        <Text style={s.tagline}>{t('common.appTagline')}</Text>
      </View>

      <View style={s.bottom}>
        <View style={s.dots}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[s.dot, i === 0 && s.dotActive]} />
          ))}
        </View>

        <TouchableOpacity
          style={s.btn}
          activeOpacity={0.8}
          onPress={() => router.push('/(onboarding)/language' as any)}
        >
          <Text style={s.btnText}>{t('onboarding.welcome.start')}</Text>
        </TouchableOpacity>

        <Text style={s.hint}>{t('onboarding.welcome.hint')}</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md },
  logo:      { ...theme.font.displayLg, fontSize: 32, color: theme.colors.text, fontFamily: theme.font.family },
  tagline:   { ...theme.font.displaySm, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  bottom:    { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, gap: theme.spacing.lg, alignItems: 'center' },
  dots:      { flexDirection: 'row', gap: 6 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.bgElevated },
  dotActive: { backgroundColor: theme.colors.text, width: 18 },
  btn:       { width: '100%', backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText:   { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
  hint:      { ...theme.font.bodySmall, color: theme.colors.textMuted, fontFamily: theme.font.family },
});
