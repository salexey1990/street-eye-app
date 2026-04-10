import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';

type Category = 'VISUAL' | 'TECHNICAL' | 'SOCIAL' | 'LIMITATIONS';

const CATEGORY_ICONS: Record<Category, keyof typeof Ionicons.glyphMap> = {
  VISUAL:      'eye-outline',
  TECHNICAL:   'settings-outline',
  SOCIAL:      'people-outline',
  LIMITATIONS: 'flash-outline',
};

const CATEGORIES: Category[] = ['VISUAL', 'TECHNICAL', 'SOCIAL', 'LIMITATIONS'];

interface Props {
  visible:  boolean;
  current:  Category[];
  onSave:   (categories: Category[]) => void;
  onClose:  () => void;
}

export function CategoriesSheet({ visible, current, onSave, onClose }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Category[]>(current);
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      setSelected(current);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 400, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  const toggle = (value: Category) => {
    setSelected((prev) => {
      if (prev.includes(value)) {
        return prev.length > 1 ? prev.filter((v) => v !== value) : prev;
      }
      return prev.length < 2 ? [...prev, value] : [prev[1], value];
    });
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={s.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.handle} />
        <Text style={s.title}>{t('profile.categories.sheetTitle')}</Text>
        <Text style={s.subtitle}>{t('onboarding.preferences.subtitle')}</Text>

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

        <TouchableOpacity style={s.btn} activeOpacity={0.8} onPress={() => onSave(selected)}>
          <Text style={s.btnText}>{t('common.save')}</Text>
        </TouchableOpacity>
      </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:        { backgroundColor: theme.colors.bgSurface, borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg, padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.md },
  handle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.bgElevated, alignSelf: 'center', marginBottom: theme.spacing.sm },
  title:        { ...theme.font.displaySm, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
  subtitle:     { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family, marginTop: -theme.spacing.sm },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  card:         { width: '48.5%', aspectRatio: 1, backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.lg, padding: theme.spacing.md, justifyContent: 'flex-end', gap: 4 },
  cardActive:   { backgroundColor: theme.colors.accent },
  cardName:     { ...theme.font.body, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
  cardNameActive: { color: theme.colors.text },
  cardSub:      { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  cardSubActive:{ color: 'rgba(255,255,255,0.7)' },
  btn:          { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.sm },
  btnText:      { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
});
