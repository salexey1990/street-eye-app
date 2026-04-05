import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { tasksApi, Task } from '@/lib/api/tasks';
import { theme } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Locale   = 'ru' | 'en';
type Level    = 'BEGINNER' | 'INTERMEDIATE' | 'PRO';
type Category = 'VISUAL' | 'TECHNICAL' | 'SOCIAL' | 'LIMITATIONS';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5; // steps after welcome

const LEVELS: Level[] = ['BEGINNER', 'INTERMEDIATE', 'PRO'];
const LEVEL_ICONS: Record<Level, keyof typeof Ionicons.glyphMap> = {
  BEGINNER:     'camera-outline',
  INTERMEDIATE: 'refresh-circle-outline',
  PRO:          'aperture-outline',
};

const CATEGORIES: Category[] = ['VISUAL', 'TECHNICAL', 'SOCIAL', 'LIMITATIONS'];
const CATEGORY_ICONS: Record<Category, keyof typeof Ionicons.glyphMap> = {
  VISUAL:      'eye-outline',
  TECHNICAL:   'settings-outline',
  SOCIAL:      'people-outline',
  LIMITATIONS: 'flash-outline',
};

const LANGUAGES: { locale: Locale; name: string; sub: string; flag: string }[] = [
  { locale: 'ru', name: 'Русский', sub: 'Russian',    flag: 'RU' },
  { locale: 'en', name: 'English', sub: 'Английский', flag: 'GB' },
];

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={pb.bar}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View key={i} style={[pb.seg, i < step && pb.segActive]} />
      ))}
    </View>
  );
}
const pb = StyleSheet.create({
  bar:       { flexDirection: 'row', gap: 4, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md },
  seg:       { flex: 1, height: 3, borderRadius: 2, backgroundColor: theme.colors.bgElevated },
  segActive: { backgroundColor: theme.colors.accent },
});

// ─── Main Pager ───────────────────────────────────────────────────────────────

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const router    = useRouter();

  const [page,       setPage]       = useState(0);
  const [locale,     setLocale]     = useState<Locale>('ru');
  const [level,      setLevel]      = useState<Level>('BEGINNER');
  const [categories, setCategories] = useState<Category[]>(['VISUAL']);

  const goTo = useCallback((next: number) => {
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setPage(next);
  }, [width]);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    setPage(next);
  }, [width]);

  const handleLocaleChange = useCallback(async (l: Locale) => {
    setLocale(l);
    await i18n.changeLanguage(l);
    await AsyncStorage.setItem('locale', l);
  }, []);

  const handleFinish = useCallback(async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    await AsyncStorage.setItem('onboarding_data', JSON.stringify({
      locale,
      level,
      preferredCategories: categories,
    }));
    router.replace('/(tabs)' as any);
  }, [locale, level, categories, router]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        <WelcomePage
          width={width}
          page={page}
          onNext={() => goTo(1)}
        />
        <LanguagePage
          width={width}
          page={page}
          locale={locale}
          onChange={handleLocaleChange}
          onNext={() => goTo(2)}
        />
        <LevelPage
          width={width}
          page={page}
          level={level}
          onChange={setLevel}
          onNext={() => goTo(3)}
        />
        <PreferencesPage
          width={width}
          page={page}
          categories={categories}
          onChange={setCategories}
          onNext={() => goTo(4)}
        />
        <NotificationsPage
          width={width}
          page={page}
          onNext={() => goTo(5)}
        />
        <FirstTaskPage
          width={width}
          page={page}
          locale={locale}
          level={level}
          categories={categories}
          onFinish={handleFinish}
        />
      </ScrollView>
    </View>
  );
}

// ─── Step 0: Welcome ──────────────────────────────────────────────────────────

function WelcomePage({ width, page, onNext }: {
  width: number; page: number; onNext: () => void;
}) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={[s.page, { width }]}>
      <View style={s.center}>
        <Ionicons name="aperture" size={80} color={theme.colors.accent} />
        <Text style={s.logo}>StreetEye</Text>
        <Text style={s.tagline}>{t('common.appTagline')}</Text>
      </View>

      <View style={s.welcomeBottom}>
        <View style={s.dots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[s.dot, i === page - 1 && s.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={s.btn} activeOpacity={0.8} onPress={onNext}>
          <Text style={s.btnText}>{t('onboarding.welcome.start')}</Text>
        </TouchableOpacity>
        <Text style={s.hint}>{t('onboarding.welcome.hint')}</Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 1: Language ─────────────────────────────────────────────────────────

function LanguagePage({ width, page, locale, onChange, onNext }: {
  width: number; page: number; locale: Locale;
  onChange: (l: Locale) => void; onNext: () => void;
}) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={[s.page, { width }]}>
      <ProgressBar step={page} />
      <View style={s.content}>
        <View style={s.heading}>
          <Text style={s.title}>{t('onboarding.language.title')}</Text>
          <Text style={s.subtitle}>{t('onboarding.language.subtitle')}</Text>
        </View>
        <View style={s.list}>
          {LANGUAGES.map(({ locale: l, name, sub, flag }) => {
            const active = locale === l;
            return (
              <TouchableOpacity
                key={l}
                style={[s.card, active && s.cardActive]}
                activeOpacity={0.8}
                onPress={() => onChange(l)}
              >
                <View style={[s.flag, active && s.flagActive]}>
                  <Text style={[s.flagText, active && s.flagTextActive]}>{flag}</Text>
                </View>
                <View style={s.cardText}>
                  <Text style={[s.cardName, active && s.cardNameActive]}>{name}</Text>
                  <Text style={[s.cardSub, active && s.cardSubActive]}>{sub}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={22} color={theme.colors.text} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={s.footer}>
        <TouchableOpacity style={s.btn} activeOpacity={0.8} onPress={onNext}>
          <Text style={s.btnText}>{t('common.continue')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 2: Level ────────────────────────────────────────────────────────────

function LevelPage({ width, page, level, onChange, onNext }: {
  width: number; page: number; level: Level;
  onChange: (l: Level) => void; onNext: () => void;
}) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={[s.page, { width }]}>
      <ProgressBar step={page} />
      <View style={s.content}>
        <View style={s.heading}>
          <Text style={s.title}>{t('onboarding.level.title')}</Text>
          <Text style={s.subtitle}>{t('onboarding.level.subtitle')}</Text>
        </View>
        <View style={s.list}>
          {LEVELS.map((value) => {
            const active = level === value;
            return (
              <TouchableOpacity
                key={value}
                style={[s.card, active && s.cardActive]}
                activeOpacity={0.8}
                onPress={() => onChange(value)}
              >
                <View style={[s.iconBox, active && s.iconBoxActive]}>
                  <Ionicons
                    name={LEVEL_ICONS[value]}
                    size={22}
                    color={active ? theme.colors.text : theme.colors.iconMuted}
                  />
                </View>
                <View style={s.cardText}>
                  <Text style={[s.cardName, active && s.cardNameActive]}>
                    {t(`onboarding.level.${value}.name`)}
                  </Text>
                  <Text style={[s.cardDesc, active && s.cardDescActive]}>
                    {t(`onboarding.level.${value}.desc`)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={s.footer}>
        <TouchableOpacity style={s.btn} activeOpacity={0.8} onPress={onNext}>
          <Text style={s.btnText}>{t('common.continue')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 3: Preferences ──────────────────────────────────────────────────────

function PreferencesPage({ width, page, categories, onChange, onNext }: {
  width: number; page: number; categories: Category[];
  onChange: (c: Category[]) => void; onNext: () => void;
}) {
  const { t } = useTranslation();

  const toggle = (value: Category) => {
    if (categories.includes(value)) {
      if (categories.length > 1) onChange(categories.filter((v) => v !== value));
    } else {
      onChange(categories.length < 2 ? [...categories, value] : [categories[1], value]);
    }
  };

  return (
    <SafeAreaView style={[s.page, { width }]}>
      <ProgressBar step={page} />
      <View style={s.content}>
        <View style={s.heading}>
          <Text style={s.title}>{t('onboarding.preferences.title')}</Text>
          <Text style={s.subtitle}>{t('onboarding.preferences.subtitle')}</Text>
        </View>
        <View style={s.grid}>
          {CATEGORIES.map((value) => {
            const active = categories.includes(value);
            return (
              <TouchableOpacity
                key={value}
                style={[s.gridCard, active && s.cardActive]}
                activeOpacity={0.8}
                onPress={() => toggle(value)}
              >
                <Ionicons
                  name={CATEGORY_ICONS[value]}
                  size={24}
                  color={active ? theme.colors.text : theme.colors.iconMuted}
                />
                <Text style={[s.cardName, active && s.cardNameActive]}>
                  {t(`onboarding.preferences.${value}.name`)}
                </Text>
                <Text style={[s.cardSub, active && s.cardSubActive]}>
                  {t(`onboarding.preferences.${value}.sub`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={s.footer}>
        <TouchableOpacity style={s.btn} activeOpacity={0.8} onPress={onNext}>
          <Text style={s.btnText}>{t('common.continue')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 4: Notifications ────────────────────────────────────────────────────

function NotificationsPage({ width, page, onNext }: {
  width: number; page: number; onNext: () => void;
}) {
  const { t } = useTranslation();

  const handleAllow = async () => {
    await Notifications.requestPermissionsAsync();
    onNext();
  };

  return (
    <SafeAreaView style={[s.page, { width }]}>
      <ProgressBar step={page} />
      <View style={[s.content, s.contentCenter]}>
        <View style={s.iconWrap}>
          <Ionicons name="notifications-outline" size={44} color={theme.colors.accent} />
        </View>
        <View style={s.textCenter}>
          <Text style={[s.title, s.textAlignCenter]}>{t('onboarding.notifications.title')}</Text>
          <Text style={[s.subtitle, s.textAlignCenter]}>{t('onboarding.notifications.subtitle')}</Text>
        </View>
      </View>
      <View style={[s.footer, s.footerCenter]}>
        <TouchableOpacity style={s.btn} activeOpacity={0.8} onPress={handleAllow}>
          <Text style={s.btnText}>{t('onboarding.notifications.allow')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onNext} hitSlop={12}>
          <Text style={s.skip}>{t('onboarding.notifications.skip')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 5: First Task ───────────────────────────────────────────────────────

function FirstTaskPage({ width, page, locale, level, categories, onFinish }: {
  width: number; page: number;
  locale: 'ru' | 'en'; level: Level; categories: Category[];
  onFinish: () => void;
}) {
  const { t } = useTranslation();
  const [task,    setTask]    = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (page === 5 && !task && !loading) loadTask();
  }, [page]);

  const loadTask = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tasksApi.getGuestRandom({ locale, level, categories });
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

  return (
    <SafeAreaView style={[s.page, { width }]}>
      <ProgressBar step={page} />
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
          <View style={s.taskCard}>
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
        ) : null}
      </View>

      <View style={s.footer}>
        <TouchableOpacity style={s.btn} activeOpacity={0.8} onPress={onFinish}>
          <Text style={s.btnText}>{t('onboarding.firstTask.start')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // page shell
  page:            { flex: 1, backgroundColor: theme.colors.bg },
  content:         { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl, gap: theme.spacing.xl },
  contentCenter:   { alignItems: 'center', justifyContent: 'center' },
  footer:          { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg },
  footerCenter:    { alignItems: 'center', gap: theme.spacing.lg },

  // welcome
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md },
  logo:            { ...theme.font.displayLg, fontSize: 32, color: theme.colors.text, fontFamily: theme.font.family },
  tagline:         { ...theme.font.displaySm, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  welcomeBottom:   { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, gap: theme.spacing.lg, alignItems: 'center' },
  dots:            { flexDirection: 'row', gap: 6 },
  dot:             { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.bgElevated },
  dotActive:       { backgroundColor: theme.colors.text, width: 18 },
  hint:            { ...theme.font.bodySmall, color: theme.colors.textMuted, fontFamily: theme.font.family },

  // common headings
  heading:         { gap: theme.spacing.xs },
  title:           { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family },
  subtitle:        { ...theme.font.displaySm, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  textAlignCenter: { textAlign: 'center' },
  textCenter:      { alignItems: 'center', gap: theme.spacing.sm },

  // list (language, level)
  list:            { gap: theme.spacing.sm },
  card:            { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, padding: theme.spacing.md },
  cardActive:      { backgroundColor: theme.colors.accent },
  cardText:        { flex: 1 },
  cardName:        { ...theme.font.body, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
  cardNameActive:  { color: theme.colors.text },
  cardDesc:        { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family, marginTop: 2 },
  cardDescActive:  { color: 'rgba(255,255,255,0.7)' },
  cardSub:         { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  cardSubActive:   { color: 'rgba(255,255,255,0.7)' },

  // language flags
  flag:            { width: 40, height: 40, borderRadius: theme.radius.sm, backgroundColor: theme.colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  flagActive:      { backgroundColor: 'rgba(255,255,255,0.2)' },
  flagText:        { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, fontFamily: theme.font.family },
  flagTextActive:  { color: theme.colors.text },

  // level icons
  iconBox:         { width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  iconBoxActive:   { backgroundColor: 'rgba(255,255,255,0.2)' },

  // preferences grid
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  gridCard:        { width: '48.5%', aspectRatio: 1, backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, padding: theme.spacing.md, justifyContent: 'flex-end', gap: 4 },

  // notifications
  iconWrap:        { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.bgSurface, alignItems: 'center', justifyContent: 'center' },
  skip:            { ...theme.font.link, color: theme.colors.textSecondary, fontFamily: theme.font.family },

  // first task card
  loader:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  taskCard:        { backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md },
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

  // error state
  errorBox:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg },
  errorText:       { ...theme.font.body, color: '#FF6B6B', textAlign: 'center', fontFamily: theme.font.family },
  retryBtn:        { backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.sm },
  retryText:       { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },

  // shared button
  btn:             { width: '100%', backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText:         { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
});
