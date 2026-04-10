import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';
import { useJournalStore } from '@/store/journal.store';
import { EntrySheet } from '@/components/journal/EntrySheet';

const RATING_ICON: Record<string, { name: string; color: string; label: string }> = {
  SUCCESS: { name: 'checkmark-circle',  color: '#4CD964', label: 'journal.ratings.success' },
  PARTIAL: { name: 'remove-circle',     color: '#FF9500', label: 'journal.ratings.partial' },
  FAILED:  { name: 'close-circle',      color: '#FF3B30', label: 'journal.ratings.failed'  },
};

const CATEGORY_LABEL: Record<string, string> = {
  VISUAL:      'Визуальное',
  TECHNICAL:   'Техническое',
  SOCIAL:      'Социальное',
  LIMITATIONS: 'Ограничения',
  RESTRICTION: 'Ограничения',
};

function formatDateFull(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function JournalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { entries, deleteEntry } = useJournalStore();
  const [editVisible, setEditVisible] = useState(false);

  const entry = entries.find((e) => e.id === id);

  if (!entry) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Text style={s.notFound}>Запись не найдена</Text>
        </View>
      </SafeAreaView>
    );
  }

  const rating = RATING_ICON[entry.self_rating] ?? RATING_ICON.SUCCESS;
  const category = CATEGORY_LABEL[entry.task_category] ?? entry.task_category;

  const handleDelete = () => {
    Alert.alert(
      'Удалить запись?',
      'Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            await deleteEntry(entry.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Toolbar */}
      <View style={s.toolbar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={s.toolbarBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={s.toolbarActions}>
          <TouchableOpacity onPress={() => setEditVisible(true)} hitSlop={12} style={s.toolbarBtn}>
            <Ionicons name="pencil-outline" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} hitSlop={12} style={s.toolbarBtn}>
            <Ionicons name="trash-outline" size={22} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Photo */}
        {entry.photo_uri ? (
          <Image source={{ uri: entry.photo_uri }} style={s.photo} resizeMode="cover" />
        ) : null}

        {/* Rating pill */}
        <View style={[s.ratingPill, { borderColor: rating.color }]}>
          <Ionicons name={rating.name as any} size={18} color={rating.color} />
          <Text style={[s.ratingText, { color: rating.color }]}>{t(rating.label)}</Text>
        </View>

        {/* Task title */}
        <Text style={s.taskTitle}>{entry.task_title || '—'}</Text>

        {/* Meta row */}
        <View style={s.metaRow}>
          {category ? (
            <View style={s.badge}>
              <Text style={s.badgeText}>{category}</Text>
            </View>
          ) : null}
          <Text style={s.date}>{formatDateFull(entry.created_at)}</Text>
        </View>

        {/* Note */}
        {entry.note ? (
          <View style={s.noteBox}>
            <Text style={s.noteLabel}>Заметка</Text>
            <Text style={s.noteText}>{entry.note}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Edit sheet */}
      <EntrySheet
        mode="edit"
        visible={editVisible}
        entry={entry}
        onClose={() => setEditVisible(false)}
        onSaved={() => setEditVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: theme.colors.bg },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound:       { ...theme.font.body, color: theme.colors.textSecondary, fontFamily: theme.font.family },

  toolbar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  toolbarBtn:     { padding: theme.spacing.sm },
  toolbarActions: { flexDirection: 'row', gap: theme.spacing.sm },

  content:        { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },

  photo:          { width: '100%', height: 240, borderRadius: theme.radius.lg },

  ratingPill:     { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: theme.radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  ratingText:     { ...theme.font.bodySmall, fontFamily: theme.font.family, fontWeight: '600' },

  taskTitle:      { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family },

  metaRow:        { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' },
  badge:          { backgroundColor: theme.colors.accent + '33', borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText:      { fontSize: 13, color: theme.colors.accent, fontFamily: theme.font.family },
  date:           { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },

  noteBox:        { backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, padding: theme.spacing.md, gap: theme.spacing.sm },
  noteLabel:      { ...theme.font.label, color: theme.colors.textSecondary, fontFamily: theme.font.family, fontWeight: '600' },
  noteText:       { ...theme.font.body, color: theme.colors.text, fontFamily: theme.font.family },
});
