import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { theme } from '@/constants/theme';

const TOTAL_STEPS = 5;
const STEP = 1;

type Locale = 'ru' | 'en';

const LANGUAGES: { locale: Locale; name: string; sub: string; flag: string }[] = [
  { locale: 'ru', name: 'Русский', sub: 'Russian',     flag: 'RU' },
  { locale: 'en', name: 'English', sub: 'Английский',  flag: 'GB' },
];

export default function Language() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Locale>('ru');

  const handleContinue = async () => {
    await i18n.changeLanguage(selected);
    await AsyncStorage.setItem('locale', selected);
    const raw = await AsyncStorage.getItem('onboarding_data');
    const data = raw ? JSON.parse(raw) : {};
    await AsyncStorage.setItem('onboarding_data', JSON.stringify({ ...data, locale: selected }));
    router.push('/(onboarding)/level' as any);
  };

  return (
    <SafeAreaView style={s.container}>
      <ProgressBar step={STEP} total={TOTAL_STEPS} />

      <View style={s.content}>
        <View style={s.heading}>
          <Text style={s.title}>{t('onboarding.language.title')}</Text>
          <Text style={s.subtitle}>{t('onboarding.language.subtitle')}</Text>
        </View>

        <View style={s.list}>
          {LANGUAGES.map(({ locale, name, sub, flag }) => {
            const active = selected === locale;
            return (
              <TouchableOpacity
                key={locale}
                style={[s.card, active && s.cardActive]}
                activeOpacity={0.8}
                onPress={() => setSelected(locale)}
              >
                <View style={[s.flag, active && s.flagActive]}>
                  <Text style={[s.flagText, active && s.flagTextActive]}>{flag}</Text>
                </View>
                <View style={s.cardText}>
                  <Text style={[s.cardName, active && s.cardNameActive]}>{name}</Text>
                  <Text style={[s.cardSub, active && s.cardSubActive]}>{sub}</Text>
                </View>
                {active && (
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.text} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={s.footer}>
        <TouchableOpacity style={s.btn} activeOpacity={0.8} onPress={handleContinue}>
          <Text style={s.btnText}>{t('common.continue')}</Text>
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
  list:            { gap: theme.spacing.sm },
  card:            { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, padding: theme.spacing.md },
  cardActive:      { backgroundColor: theme.colors.accent },
  flag:            { width: 40, height: 40, borderRadius: theme.radius.sm, backgroundColor: theme.colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  flagActive:      { backgroundColor: 'rgba(255,255,255,0.2)' },
  flagText:        { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, fontFamily: theme.font.family },
  flagTextActive:  { color: theme.colors.text },
  cardText:        { flex: 1 },
  cardName:        { ...theme.font.body, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
  cardNameActive:  { color: theme.colors.text },
  cardSub:         { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  cardSubActive:   { color: 'rgba(255,255,255,0.7)' },
  footer:          { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg },
  btn:             { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText:         { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
});
