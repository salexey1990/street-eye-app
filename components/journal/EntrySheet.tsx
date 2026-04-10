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
import { JournalEntry } from '@/lib/db/journal';

interface CreateProps {
  mode:         'create';
  visible:      boolean;
  sessionId:    string;
  taskId:       string;
  taskTitle:    string;
  taskCategory: string;
  onClose:      () => void;
  onSaved?:     (entry: JournalEntry) => void;
}

interface EditProps {
  mode:    'edit';
  visible: boolean;
  entry:   JournalEntry;
  onClose: () => void;
  onSaved?: () => void;
}

type Props = CreateProps | EditProps;

const RATINGS: { value: SelfRating; icon: string; labelKey: string }[] = [
  { value: 'FAILED',  icon: 'close-circle-outline',   labelKey: 'journal.ratings.failed' },
  { value: 'PARTIAL', icon: 'remove-circle-outline',  labelKey: 'journal.ratings.partial' },
  { value: 'SUCCESS', icon: 'checkmark-circle-outline', labelKey: 'journal.ratings.success' },
];

const MAX_NOTE = 500;

export function EntrySheet(props: Props) {
  const { t } = useTranslation();
  const store = useJournalStore();

  const isEdit = props.mode === 'edit';
  const initRating: SelfRating = isEdit ? (props as EditProps).entry.self_rating : 'SUCCESS';
  const initNote   = isEdit ? ((props as EditProps).entry.note ?? '') : '';
  const initPhoto  = isEdit ? ((props as EditProps).entry.photo_uri ?? null) : null;

  const [rating,   setRating]   = useState<SelfRating>(initRating);
  const [note,     setNote]     = useState(initNote);
  const [photoUri, setPhotoUri] = useState<string | null>(initPhoto);
  const [saving,   setSaving]   = useState(false);

  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (props.visible) {
      // Reset to initial values
      if (isEdit) {
        const e = (props as EditProps).entry;
        setRating(e.self_rating);
        setNote(e.note ?? '');
        setPhotoUri(e.photo_uri ?? null);
      } else {
        setRating('SUCCESS');
        setNote('');
        setPhotoUri(null);
      }
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start();
    }
  }, [props.visible]);

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
    Keyboard.dismiss();
    setSaving(true);
    try {
      if (isEdit) {
        const e = (props as EditProps).entry;
        await store.updateEntry(e.id, {
          note:      note.trim() || null,
          selfRating: rating,
          photoUri:  photoUri,
        });
        props.onSaved?.();
      } else {
        const p = props as CreateProps;
        const entry = await store.createEntry({
          sessionId:    p.sessionId,
          taskId:       p.taskId,
          taskTitle:    p.taskTitle,
          taskCategory: p.taskCategory,
          selfRating:   rating,
          note:         note.trim() || null,
          photoUri,
        });
        p.onSaved?.(entry);
      }
      props.onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={props.visible} transparent animationType="none" statusBarTranslucent onRequestClose={props.onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>
              {isEdit
                ? t('journal.editTitle', { defaultValue: 'Редактировать запись' })
                : t('journal.newTitle', { defaultValue: 'Запись в дневник' })}
            </Text>
            <TouchableOpacity onPress={props.onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={theme.colors.iconMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Self-rating */}
            <Text style={s.label}>{t('journal.ratingLabel', { defaultValue: 'Как прошло?' })}</Text>
            <View style={s.ratingRow}>
              {RATINGS.map(({ value, icon, labelKey }) => {
                const active = rating === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[s.ratingBtn, active && s.ratingBtnActive]}
                    onPress={() => setRating(value)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={icon as any}
                      size={22}
                      color={active ? theme.colors.text : theme.colors.iconMuted}
                    />
                    <Text style={[s.ratingText, active && s.ratingTextActive]}>
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
                placeholder={t('journal.notePlaceholder', { defaultValue: 'Что получилось, что нет...' })}
                placeholderTextColor={theme.colors.textMuted}
                value={note}
                onChangeText={(v) => setNote(v.slice(0, MAX_NOTE))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={s.noteCounter}>{note.length}/{MAX_NOTE}</Text>
            </View>

            {/* Photo */}
            <Text style={s.label}>{t('journal.photoLabel', { defaultValue: 'Фото' })}</Text>
            <TouchableOpacity style={s.photoBtn} onPress={pickPhoto} activeOpacity={0.8}>
              {photoUri ? (
                <>
                  <Image source={{ uri: photoUri }} style={s.photoPreview} resizeMode="cover" />
                  <TouchableOpacity style={s.photoRemove} onPress={() => setPhotoUri(null)}>
                    <Ionicons name="close-circle" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Ionicons name="image-outline" size={28} color={theme.colors.iconMuted} />
                  <Text style={s.photoBtnText}>
                    {t('journal.addPhoto', { defaultValue: 'Добавить фото' })}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 8 }} />
          </ScrollView>

          {/* Save */}
          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color={theme.colors.text} />
              : <Text style={s.saveBtnText}>{t('journal.save', { defaultValue: 'Сохранить' })}</Text>}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:         { flex: 1, justifyContent: 'flex-end' },
  backdrop:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:           { backgroundColor: theme.colors.bgSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing.lg, paddingBottom: 36, maxHeight: '90%' },
  handle:          { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.bgElevated, alignSelf: 'center', marginBottom: theme.spacing.md },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  title:           { ...theme.font.displaySm, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
  label:           { ...theme.font.label, color: theme.colors.textSecondary, fontFamily: theme.font.family, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  // Rating
  ratingRow:       { flexDirection: 'row', gap: theme.spacing.sm },
  ratingBtn:       { flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4, backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.md, paddingVertical: 12 },
  ratingBtnActive: { backgroundColor: theme.colors.accent },
  ratingText:      { ...theme.font.bodySmall, color: theme.colors.textMuted, fontFamily: theme.font.family, textAlign: 'center' },
  ratingTextActive:{ color: theme.colors.text },
  // Note
  noteWrap:        { backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.md, padding: theme.spacing.md },
  noteInput:       { ...theme.font.body, color: theme.colors.text, fontFamily: theme.font.family, minHeight: 90 },
  noteCounter:     { ...theme.font.bodySmall, color: theme.colors.textMuted, fontFamily: theme.font.family, textAlign: 'right', marginTop: 4 },
  // Photo
  photoBtn:        { height: 120, backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.lg, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, overflow: 'hidden' },
  photoBtnText:    { ...theme.font.bodySmall, color: theme.colors.textMuted, fontFamily: theme.font.family },
  photoPreview:    { width: '100%', height: '100%' },
  photoRemove:     { position: 'absolute', top: 8, right: 8 },
  // Save
  saveBtn:         { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.lg },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
});
