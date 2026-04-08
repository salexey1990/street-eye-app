import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';

export default function JournalScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t('journal.title')}</Text>
      </View>
      <View style={s.center}>
        <Ionicons name="book-outline" size={64} color={theme.colors.iconMuted} />
        <Text style={s.empty}>{t('journal.empty')}</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header:    { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl },
  title:     { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md },
  empty:     { ...theme.font.displaySm, color: theme.colors.textSecondary, fontFamily: theme.font.family },
});
