import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';

const TOTAL_STEPS = 5;
const STEP = 3;

type Category = 'VISUAL' | 'TECHNICAL' | 'SOCIAL' | 'LIMITATIONS';

const CATEGORY_ICONS: Record<Category, keyof typeof Ionicons.glyphMap> = {
  VISUAL:      'eye-outline',
  TECHNICAL:   'settings-outline',
  SOCIAL:      'people-outline',
  LIMITATIONS: 'flash-outline',
};

const CATEGORIES: Category[] = ['VISUAL', 'TECHNICAL', 'SOCIAL', 'LIMITATIONS'];

export default function Preferences() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Category[]>(['VISUAL']);

  const toggle = (value: Category) => {
    setSelected((prev) => {
      if (prev.includes(value)) {
        return prev.length > 1 ? prev.filter((v) => v !== value) : prev;
      }
      return prev.length < 2 ? [...prev, value] : [prev[1], value];
    });
  };

  const handleContinue = async () => {
    const raw = await AsyncStorage.getItem('onboarding_data');
    const data = raw ? JSON.parse(raw) : {};
    await AsyncStorage.setItem('onboarding_data', JSON.stringify({ ...data, preferredCategories: selected }));
    router.push('/(onboarding)/notifications' as any);
  };

  return (
    <SafeAreaView style={s.container}>
      <ProgressBar step={STEP} total={TOTAL_STEPS} />

      <View style={s.content}>
        <View style={s.heading}>
          <Text style={s.title}>{t('onboarding.preferences.title')}</Text>
          <Text style={s.subtitle}>{t('onboarding.preferences.subtitle')}</Text>
        </View>

        <View style={s.grid}>
          {CATEGORIES.map((value) => {
            const active = selected.includes(value);
            return (
              <TouchableOpacity
                key={value}
                style={[s.card, active && s.cardActive]}
                activeOpacity={0.8}
                onPress={() => toggle(value)}
              >
                <Ionicons name={CATEGORY_ICONS[value]} size={24} color={active ? theme.colors.text : theme.colors.iconMuted} />
                <Text style={[s.cardName, active && s.cardNameActive]}>{t(`onboarding.preferences.${value}.name`)}</Text>
                <Text style={[s.cardSub, active && s.cardSubActive]}>{t(`onboarding.preferences.${value}.sub`)}</Text>
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
  container:     { flex: 1, backgroundColor: theme.colors.bg },
  content:       { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl, gap: theme.spacing.xl },
  heading:       { gap: theme.spacing.xs },
  title:         { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family },
  subtitle:      { ...theme.font.displaySm, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  card:          { width: '48.5%', aspectRatio: 1, backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, padding: theme.spacing.md, justifyContent: 'flex-end', gap: 4 },
  cardActive:    { backgroundColor: theme.colors.accent },
  cardName:      { ...theme.font.body, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
  cardNameActive: { color: theme.colors.text },
  cardSub:       { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  cardSubActive: { color: 'rgba(255,255,255,0.7)' },
  footer:        { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg },
  btn:           { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText:       { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
});
