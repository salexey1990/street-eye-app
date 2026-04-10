import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useJournalStore } from '@/store/journal.store';
import { JournalEntry } from '@/lib/db/journal';

const RATING_ICON: Record<string, { name: string; color: string }> = {
  SUCCESS: { name: 'checkmark-circle',  color: '#4CD964' },
  PARTIAL: { name: 'remove-circle',     color: '#FF9500' },
  FAILED:  { name: 'close-circle',      color: '#FF3B30' },
};

const CATEGORY_LABEL: Record<string, string> = {
  VISUAL:      'Визуальное',
  TECHNICAL:   'Техническое',
  SOCIAL:      'Социальное',
  LIMITATIONS: 'Ограничения',
  RESTRICTION: 'Ограничения',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function EntryCard({ entry, onPress }: { entry: JournalEntry; onPress: () => void }) {
  const rating = RATING_ICON[entry.self_rating] ?? RATING_ICON.SUCCESS;
  const category = CATEGORY_LABEL[entry.task_category] ?? entry.task_category;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      {/* Thumbnail or placeholder */}
      <View style={s.thumb}>
        {entry.photo_uri ? (
          <Image source={{ uri: entry.photo_uri }} style={s.thumbImg} resizeMode="cover" />
        ) : (
          <Ionicons name="image-outline" size={28} color={theme.colors.iconMuted} />
        )}
      </View>

      {/* Card body */}
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={2}>
          {entry.task_title || '—'}
        </Text>

        <View style={s.cardMeta}>
          <Text style={s.cardDate}>{formatDate(entry.created_at)}</Text>
          {category ? (
            <View style={s.badge}>
              <Text style={s.badgeText}>{category}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Rating icon */}
      <Ionicons
        name={rating.name as any}
        size={22}
        color={rating.color}
        style={s.cardRating}
      />
    </TouchableOpacity>
  );
}

export default function JournalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { entries, stats, loading, load } = useJournalStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const ListHeader = (
    <View style={s.statsRow}>
      <View style={s.statCard}>
        <Text style={s.statValue}>{stats?.totalCompleted ?? entries.length}</Text>
        <Text style={s.statLabel}>{t('journal.completed')}</Text>
      </View>
      <View style={s.statCard}>
        <Text style={s.statValue}>{stats?.currentStreak ?? 0}</Text>
        <Text style={s.statLabel}>{t('journal.streak')}</Text>
      </View>
    </View>
  );

  const ListEmpty = (
    <View style={s.empty}>
      <Ionicons name="book-outline" size={64} color={theme.colors.iconMuted} />
      <Text style={s.emptyText}>{t('journal.empty')}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>{t('journal.title')}</Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={entries.length === 0 ? s.listEmpty : s.list}
        ListHeaderComponent={entries.length > 0 ? ListHeader : null}
        ListEmptyComponent={!loading ? ListEmpty : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
        renderItem={({ item }) => (
          <EntryCard
            entry={item}
            onPress={() => router.push(`/journal/${item.id}` as any)}
          />
        )}
        ItemSeparatorComponent={() => <View style={s.separator} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: theme.colors.bg },
  header:      { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
  title:       { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family },

  list:        { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  listEmpty:   { flex: 1 },

  // Stats
  statsRow:    { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg, marginTop: theme.spacing.sm },
  statCard:    { flex: 1, backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, padding: theme.spacing.md, alignItems: 'center', gap: 2 },
  statValue:   { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family },
  statLabel:   { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },

  // Entry card
  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, overflow: 'hidden' },
  thumb:       { width: 80, height: 80, backgroundColor: theme.colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  thumbImg:    { width: 80, height: 80 },
  cardBody:    { flex: 1, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, gap: 4 },
  cardTitle:   { ...theme.font.bodySmall, color: theme.colors.text, fontFamily: theme.font.family, fontWeight: '600' },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' },
  cardDate:    { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  badge:       { backgroundColor: theme.colors.accent + '33', borderRadius: theme.radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:   { fontSize: 12, color: theme.colors.accent, fontFamily: theme.font.family },
  cardRating:  { marginRight: theme.spacing.md },

  separator:   { height: theme.spacing.sm },

  // Empty
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md },
  emptyText:   { ...theme.font.displaySm, color: theme.colors.textSecondary, fontFamily: theme.font.family },
});
