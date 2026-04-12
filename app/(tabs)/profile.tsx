import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore, toUI, toBackend } from '@/store/profile.store';
import { LevelSheet } from '@/components/profile/LevelSheet';
import { CategoriesSheet } from '@/components/profile/CategoriesSheet';
import { ChangePasswordSheet } from '@/components/profile/ChangePasswordSheet';
import { PromoCodeSheet } from '@/components/profile/PromoCodeSheet';
import i18n from '@/lib/i18n';

type Level    = 'BEGINNER' | 'INTERMEDIATE' | 'PRO';
type Category = 'VISUAL' | 'TECHNICAL' | 'SOCIAL' | 'LIMITATIONS';

const BADGE_EMOJI: Record<string, string> = {
  FIRST_STEP:     '🏁',
  WEEK:           '🗓',
  STREAK_3:       '🔥',
  ALL_CATEGORIES: '⭐',
};

// ─── Badge card ────────────────────────────────────────────────────────────────

function BadgeCard({ badge }: { badge: { key: string; name: string; description: string; earned: boolean } }) {
  return (
    <View style={[bc.card, !badge.earned && bc.cardGrey]}>
      <Text style={bc.emoji}>{BADGE_EMOJI[badge.key] ?? '🏅'}</Text>
      <Text style={[bc.name, !badge.earned && bc.nameGrey]} numberOfLines={1}>{badge.name}</Text>
      <Text style={[bc.desc, !badge.earned && bc.descGrey]} numberOfLines={2}>{badge.description}</Text>
    </View>
  );
}

const bc = StyleSheet.create({
  card:     { flex: 1, backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, padding: theme.spacing.md, gap: 4, minHeight: 110 },
  cardGrey: { opacity: 0.45 },
  emoji:    { fontSize: 28 },
  name:     { ...theme.font.bodySmall, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
  nameGrey: { color: theme.colors.textSecondary },
  desc:     { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family, lineHeight: 18 },
  descGrey: { color: theme.colors.textMuted },
});

// ─── Settings row ──────────────────────────────────────────────────────────────

function SettingsRow({
  icon, label, value, onPress, rightElement,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={sr.row} activeOpacity={onPress ? 0.7 : 1} onPress={onPress} disabled={!onPress}>
      <View style={sr.left}>
        <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
        <Text style={sr.label}>{label}</Text>
      </View>
      <View style={sr.right}>
        {rightElement ?? (
          <>
            {value && <Text style={sr.value}>{value}</Text>}
            {onPress && <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const sr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.separator },
  left:  { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  right: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  label: { ...theme.font.body, color: theme.colors.text, fontFamily: theme.font.family },
  value: { ...theme.font.body, color: theme.colors.textSecondary, fontFamily: theme.font.family },
});

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const logout       = useAuthStore((s) => s.logout);
  const { user, stats, badges, loading, notificationsEnabled, reminderTime, load, updateUser, setNotifications, clear } =
    useProfileStore();

  const [levelSheet,    setLevelSheet]    = useState(false);
  const [catSheet,      setCatSheet]      = useState(false);
  const [pwSheet,       setPwSheet]       = useState(false);
  const [promoSheet,    setPromoSheet]    = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const handleLogout = async () => {
    await logout();
    clear();
    router.replace('/(auth)/login');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccount.title'),
      t('profile.deleteAccount.body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteAccount.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await useProfileStore.getState().deleteAccount();
              await logout();
              router.replace('/(auth)/login');
            } catch {
              Alert.alert(t('auth.errors.generic'));
            }
          },
        },
      ]
    );
  };

  const handleLevelSave = async (level: Level) => {
    setLevelSheet(false);
    try {
      await updateUser({ level });
    } catch {
      Alert.alert(t('auth.errors.generic'));
    }
  };

  const handleCategoriesSave = async (categories: Category[]) => {
    setCatSheet(false);
    try {
      await updateUser({ preferredCategories: categories.map(toBackend) });
    } catch {
      Alert.alert(t('auth.errors.generic'));
    }
  };

  const handleLocaleToggle = async () => {
    const nextLocale = i18n.language === 'ru' ? 'en' : 'ru';
    try {
      await updateUser({ locale: nextLocale.toUpperCase() as 'RU' | 'EN' });
    } catch {
      Alert.alert(t('auth.errors.generic'));
    }
  };

  const handleNotifToggle = async (val: boolean) => {
    await setNotifications(val);
  };

  // Current values (converted to UI types)
  const currentLevel = (user?.level ?? 'BEGINNER') as Level;
  const currentCategories = (user?.preferredCategories ?? []).map(toUI) as Category[];
  const avatarLetter = (user?.email?.[0] ?? 'A').toUpperCase();

  const levelLabel: Record<Level, string> = {
    BEGINNER:     t('onboarding.level.BEGINNER.name'),
    INTERMEDIATE: t('onboarding.level.INTERMEDIATE.name'),
    PRO:          t('onboarding.level.PRO.name'),
  };

  const localeLabel = i18n.language === 'ru' ? 'Русский' : 'English';

  if (loading && !user) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator style={{ flex: 1 }} color={theme.colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.headerTitle}>{t('tabs.profile')}</Text>
          <TouchableOpacity onPress={handleLogout} hitSlop={10}>
            <Ionicons name="exit-outline" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── User card ── */}
        <View style={s.userCard}>
          <View style={s.avatar}>
            <Text style={s.avatarLetter}>{avatarLetter}</Text>
          </View>
          <View style={s.userInfo}>
            <Text style={s.userEmail} numberOfLines={1}>{user?.email ?? '—'}</Text>
            <View style={[s.planBadge, user?.isPremium && s.planBadgePremium]}>
              <Text style={s.planBadgeText}>{user?.isPremium ? 'Premium' : 'Free'}</Text>
            </View>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats?.totalCompleted ?? user?.stats.totalCompleted ?? 0}</Text>
            <Text style={s.statLabel}>{t('profile.stats.tasks')}</Text>
          </View>
          <View style={s.statCard}>
            <View style={s.statRow}>
              <Text style={s.statNum}>{stats?.currentStreak ?? user?.stats.currentStreak ?? 0}</Text>
              <Text style={s.fireEmoji}>🔥</Text>
            </View>
            <Text style={s.statLabel}>{t('profile.stats.streak')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats?.longestStreak ?? 0}</Text>
            <Text style={s.statLabel}>{t('profile.stats.best')}</Text>
          </View>
        </View>

        {/* ── Badges ── */}
        {badges.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('profile.badges.title')}</Text>
            <View style={s.badgesGrid}>
              {badges.map((b) => (
                <BadgeCard key={b.id} badge={b} />
              ))}
            </View>
          </View>
        )}

        {/* ── Premium upsell (if Free) ── */}
        {!user?.isPremium && (
          <View style={s.premiumCard}>
            <View>
              <Text style={s.premiumTitle}>Premium</Text>
              <Text style={s.premiumSub}>{t('profile.premium.description')}</Text>
            </View>
            <TouchableOpacity style={s.premiumBtn} activeOpacity={0.8} onPress={() => router.push('/paywall')}>
              <Text style={s.premiumBtnText}>{t('profile.premium.cta')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Settings ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('profile.settings.title')}</Text>
          <View style={s.settingsBlock}>
            <SettingsRow
              icon="globe-outline"
              label={t('profile.settings.language')}
              value={localeLabel}
              onPress={handleLocaleToggle}
            />
            <SettingsRow
              icon="camera-outline"
              label={t('profile.settings.level')}
              value={levelLabel[currentLevel]}
              onPress={() => setLevelSheet(true)}
            />
            <SettingsRow
              icon="grid-outline"
              label={t('profile.settings.categories')}
              value={currentCategories.map((c) => t(`onboarding.preferences.${c}.name`)).join(', ')}
              onPress={() => setCatSheet(true)}
            />
            <SettingsRow
              icon="notifications-outline"
              label={t('profile.settings.notifications')}
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotifToggle}
                  trackColor={{ false: theme.colors.bgElevated, true: theme.colors.accent }}
                  thumbColor={theme.colors.text}
                />
              }
            />
            {notificationsEnabled && (
              <View style={s.reminderRow}>
                <Text style={s.reminderLabel}>{t('profile.settings.reminderTime')}</Text>
                <View style={s.timePresets}>
                  {['08:00', '10:00', '12:00', '18:00', '20:00'].map((t_) => (
                    <TouchableOpacity
                      key={t_}
                      style={[s.timeChip, reminderTime === t_ && s.timeChipActive]}
                      onPress={() => setNotifications(true, t_)}
                    >
                      <Text style={[s.timeChipText, reminderTime === t_ && s.timeChipTextActive]}>{t_}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Account ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('profile.account.title')}</Text>
          <View style={s.settingsBlock}>
            <SettingsRow icon="mail-outline" label={user?.email ?? '—'} />
            <SettingsRow
              icon="lock-closed-outline"
              label={t('profile.account.changePassword')}
              onPress={() => setPwSheet(true)}
            />
            {!user?.isPremium && (
              <TouchableOpacity style={s.promoRow} activeOpacity={0.8} onPress={() => setPromoSheet(true)}>
                <Ionicons name="pricetag-outline" size={20} color={theme.colors.accent} />
                <Text style={s.promoText}>{t('profile.account.activatePromo')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Danger zone ── */}
        <TouchableOpacity style={s.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.8}>
          <Text style={s.deleteBtnText}>{t('profile.account.deleteAccount')}</Text>
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity
            style={s.devBtn}
            onPress={async () => {
              await logout();
              clear();
              await AsyncStorage.multiRemove(['onboarding_complete', 'onboarding_data', 'guest_active_task', 'locale']);
              router.replace('/(onboarding)/welcome');
            }}
          >
            <Text style={s.devBtnText}>🔄 Сбросить онбординг</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Bottom sheets ── */}
      <LevelSheet
        visible={levelSheet}
        current={currentLevel}
        onSave={handleLevelSave}
        onClose={() => setLevelSheet(false)}
      />
      <CategoriesSheet
        visible={catSheet}
        current={currentCategories}
        onSave={handleCategoriesSave}
        onClose={() => setCatSheet(false)}
      />
      <ChangePasswordSheet
        visible={pwSheet}
        onClose={() => setPwSheet(false)}
        onSuccess={() => {
          setPwSheet(false);
          Alert.alert(t('profile.password.successTitle'), t('profile.password.successBody'));
        }}
      />
      <PromoCodeSheet
        visible={promoSheet}
        onClose={() => setPromoSheet(false)}
        onSuccess={() => {
          setPromoSheet(false);
          load(); // Refresh profile to show Premium status
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: theme.colors.bg },
  scroll:           { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.lg },

  // Header
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: theme.spacing.md },
  headerTitle:      { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family },

  // User card
  userCard:         { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, padding: theme.spacing.md },
  avatar:           { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarLetter:     { ...theme.font.displaySm, fontWeight: '700', color: theme.colors.text, fontFamily: theme.font.family },
  userInfo:         { flex: 1, gap: 4 },
  userEmail:        { ...theme.font.body, color: theme.colors.text, fontFamily: theme.font.family },
  planBadge:        { alignSelf: 'flex-start', backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.sm, paddingVertical: 2 },
  planBadgePremium: { backgroundColor: `${theme.colors.accent}40` },
  planBadgeText:    { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },

  // Stats
  statsRow:         { flexDirection: 'row', gap: theme.spacing.sm },
  statCard:         { flex: 1, backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, padding: theme.spacing.md, alignItems: 'center', gap: 4 },
  statRow:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNum:          { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family, lineHeight: 34 },
  fireEmoji:        { fontSize: 18, lineHeight: 34 },
  statLabel:        { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family, textAlign: 'center' },

  // Badges
  badgesGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },

  // Premium card
  premiumCard:      { backgroundColor: theme.colors.accent, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md },
  premiumTitle:     { ...theme.font.displaySm, fontWeight: '700', color: theme.colors.text, fontFamily: theme.font.family },
  premiumSub:       { ...theme.font.bodySmall, color: 'rgba(255,255,255,0.8)', fontFamily: theme.font.family },
  premiumBtn:       { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: theme.radius.pill, height: 48, alignItems: 'center', justifyContent: 'center' },
  premiumBtnText:   { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },

  // Sections
  section:          { gap: theme.spacing.sm },
  sectionTitle:     { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingsBlock:    { backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, paddingHorizontal: theme.spacing.md },

  // Notifications time
  reminderRow:      { paddingVertical: theme.spacing.md, gap: theme.spacing.sm },
  reminderLabel:    { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  timePresets:      { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
  timeChip:         { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.pill, backgroundColor: theme.colors.bgElevated },
  timeChipActive:   { backgroundColor: theme.colors.accent },
  timeChipText:     { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  timeChipTextActive:{ color: theme.colors.text },

  // Promo row
  promoRow:         { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.md },
  promoText:        { ...theme.font.body, color: theme.colors.accent, fontFamily: theme.font.family },

  // Buttons
  deleteBtn:        { alignSelf: 'center', paddingVertical: theme.spacing.sm },
  deleteBtnText:    { ...theme.font.bodySmall, color: '#FF453A', fontFamily: theme.font.family },
  devBtn:           { alignSelf: 'center', borderWidth: 1, borderColor: theme.colors.separator, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, marginTop: theme.spacing.sm },
  devBtnText:       { ...theme.font.bodySmall, color: theme.colors.textMuted, fontFamily: theme.font.family },
});
