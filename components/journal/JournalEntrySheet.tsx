import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Image,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';
import { SelfRating } from '@/lib/db/journal';
import { useJournalStore } from '@/store/journal.store';

interface Props {
  visible:      boolean;
  sessionId:    string;
  taskId:       string;
  taskTitle:    string;
  taskCategory: string;
  onSaved:      () => void;
  onSkip:       () => void;
}

const RATINGS: { value: SelfRating; symbol: string; labelKey: string; color: string; bg: string }[] = [
  { value: 'FAILED',  symbol: '✗', labelKey: 'journal.ratings.failed',  color: '#FF453A', bg: '#FF453A20' },
  { value: 'PARTIAL', symbol: '~', labelKey: 'journal.ratings.partial', color: '#FF9F0A', bg: '#FF9F0A20' },
  { value: 'SUCCESS', symbol: '✓', labelKey: 'journal.ratings.success', color: '#30D158', bg: '#30D15820' },
];

const MAX_NOTE = 500;
const NOTE_WARN = 450;

const CATEGORY_LABELS: Record<string, string> = {
  VISUAL:      'Визуальное',
  TECHNICAL:   'Техническое',
  SOCIAL:      'Социальное',
  LIMITATIONS: 'Ограничения',
  RESTRICTION: 'Ограничения',
};

export function JournalEntrySheet(props: Props) {
  const { t } = useTranslation();
  const store = useJournalStore();

  const [rating,   setRating]   = useState<SelfRating | null>(null);
  const [note,     setNote]     = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);

  const slideAnim = useRef(new Animated.Value(600)).current;

  const hasData = rating !== null || note.trim().length > 0 || photoUri !== null;

  useEffect(() => {
    if (props.visible) {
      setRating(null);
      setNote('');
      setPhotoUri(null);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start();
    }
  }, [props.visible]);

  const confirmClose = () => {
    if (hasData) {
      Alert.alert(
        t('journal.unsavedTitle', { defaultValue: 'Запись не сохранена' }),
        t('journal.unsavedBody', { defaultValue: 'Закрыть без сохранения?' }),
        [
          { text: t('common.cancel', { defaultValue: 'Отмена' }), style: 'cancel' },
          { text: t('journal.close', { defaultValue: 'Закрыть' }), style: 'destructive', onPress: props.onSkip },
        ],
      );
    } else {
      props.onSkip();
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('journal.photoPermission', { defaultValue: 'Нет доступа к галерее' }));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!rating) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      await store.createEntry({
        sessionId:    props.sessionId,
        taskId:       props.taskId,
        taskTitle:    props.taskTitle,
        taskCategory: props.taskCategory,
        selfRating:   rating,
        note:         note.trim() || null,
        photoUri,
      });
      props.onSaved();
    } finally {
      setSaving(false);
    }
  };

  const categoryLabel = CATEGORY_LABELS[props.taskCategory] ?? props.taskCategory;

  return (
    <Modal visible={props.visible} transparent animationType="none" statusBarTranslucent onRequestClose={confirmClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={s.handle} />

          {/* Task header */}
          <View style={s.taskHeader}>
            <Text style={s.taskTitle}>{props.taskTitle}</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>{categoryLabel}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Self-rating */}
            <Text style={s.label}>{t('journal.ratingLabel', { defaultValue: 'Как прошло?' })}</Text>
            <View style={s.ratingRow}>
              {RATINGS.map(({ value, symbol, labelKey, color, bg }) => {
                const active = rating === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[
                      s.ratingBtn,
                      active && { backgroundColor: bg, borderColor: color },
                    ]}
                    onPress={() => setRating(value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.ratingSymbol, active && { color }]}>{symbol}</Text>
                    <Text style={[s.ratingText, active && { color, fontWeight: '600' }]}>
                      {t(labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Note */}
            <Text style={s.label}>{t('journal.noteLabel', { defaultValue: 'Заметка' })}</Text>
            <View style={s.noteWrap}>
              <TextInput
                style={s.noteInput}
                placeholder={t('journal.notePlaceholder', { defaultValue: 'Что получилось? Что хочется попробовать иначе?' })}
                placeholderTextColor={theme.colors.textMuted}
                value={note}
                onChangeText={(v) => setNote(v.slice(0, MAX_NOTE))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={[s.noteCounter, note.length > NOTE_WARN && s.noteCounterWarn]}>
                {note.length}/{MAX_NOTE}
              </Text>
            </View>

            {/* Photo */}
            <Text style={s.label}>{t('journal.photoLabel', { defaultValue: 'Фото' })}</Text>
            {photoUri ? (
              <View style={s.photoPreviewWrap}>
                <Image source={{ uri: photoUri }} style={s.photoPreview} resizeMode="cover" />
                <TouchableOpacity style={s.photoRemove} onPress={() => setPhotoUri(null)}>
                  <Ionicons name="close-circle" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.photoBtn} onPress={pickPhoto} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={20} color={theme.colors.textMuted} />
                <Text style={s.photoBtnText}>
                  {t('journal.attachPhoto', { defaultValue: 'Прикрепить фото' })}
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 8 }} />
          </ScrollView>

          {/* Save */}
          <TouchableOpacity
            style={[s.saveBtn, (!rating || saving) && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!rating || saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color={theme.colors.text} />
              : <Text style={s.saveBtnText}>{t('journal.save', { defaultValue: 'Сохранить' })}</Text>}
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity style={s.skipBtn} onPress={confirmClose} hitSlop={8}>
            <Text style={s.skipText}>{t('journal.skip', { defaultValue: 'Пропустить' })}</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:         { flex: 1, justifyContent: 'flex-end' },
  backdrop:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:           { backgroundColor: theme.colors.bgSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 0, paddingBottom: 36, maxHeight: '90%' },
  handle:          { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.bgElevated, alignSelf: 'center', marginTop: 12, marginBottom: theme.spacing.md },

  // Task header
  taskHeader:      { gap: 6, marginBottom: theme.spacing.sm },
  taskTitle:       { fontSize: 18, fontWeight: '700', color: theme.colors.text, fontFamily: theme.font.family },
  badge:           { alignSelf: 'flex-start', backgroundColor: theme.colors.accent + '33', borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText:       { fontSize: 12, fontWeight: '500', color: theme.colors.accent, fontFamily: theme.font.family },

  label:           { ...theme.font.bodySmall, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },

  // Rating
  ratingRow:       { flexDirection: 'row', gap: theme.spacing.sm },
  ratingBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.pill, height: 44, borderWidth: 1.5, borderColor: 'transparent' },
  ratingSymbol:    { fontSize: 15, fontWeight: '600', color: theme.colors.textMuted, fontFamily: theme.font.family },
  ratingText:      { fontSize: 13, fontWeight: '500', color: theme.colors.textMuted, fontFamily: theme.font.family },

  // Note
  noteWrap:        { backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.lg, padding: theme.spacing.md },
  noteInput:       { ...theme.font.body, color: theme.colors.text, fontFamily: theme.font.family, minHeight: 80, fontSize: 14 },
  noteCounter:     { fontSize: 12, color: theme.colors.textMuted, fontFamily: theme.font.family, textAlign: 'right', marginTop: 4 },
  noteCounterWarn: { color: theme.colors.accent },

  // Photo
  photoBtn:        { flexDirection: 'row', height: 56, backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.lg, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  photoBtnText:    { fontSize: 14, fontWeight: '500', color: theme.colors.textMuted, fontFamily: theme.font.family },
  photoPreviewWrap:{ height: 120, borderRadius: theme.radius.lg, overflow: 'hidden', position: 'relative' },
  photoPreview:    { width: '100%', height: '100%' },
  photoRemove:     { position: 'absolute', top: 8, right: 8 },

  // Save
  saveBtn:         { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.lg },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText:     { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },

  // Skip
  skipBtn:         { alignItems: 'center', marginTop: theme.spacing.md },
  skipText:        { ...theme.font.bodySmall, fontWeight: '500', color: theme.colors.textSecondary, fontFamily: theme.font.family },
});
