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

type Level = 'BEGINNER' | 'INTERMEDIATE' | 'PRO';

const LEVEL_ICONS: Record<Level, keyof typeof Ionicons.glyphMap> = {
  BEGINNER:     'camera-outline',
  INTERMEDIATE: 'refresh-circle-outline',
  PRO:          'aperture-outline',
};

const LEVELS: Level[] = ['BEGINNER', 'INTERMEDIATE', 'PRO'];

interface Props {
  visible:  boolean;
  current:  Level;
  onSave:   (level: Level) => void;
  onClose:  () => void;
}

export function LevelSheet({ visible, current, onSave, onClose }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Level>(current);
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      setSelected(current);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 400, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={s.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.handle} />
        <Text style={s.title}>{t('profile.level.sheetTitle')}</Text>

        <View style={s.list}>
          {LEVELS.map((value) => {
            const active = selected === value;
            return (
              <TouchableOpacity
                key={value}
                style={[s.card, active && s.cardActive]}
                activeOpacity={0.8}
                onPress={() => setSelected(value)}
              >
                <View style={[s.iconBox, active && s.iconBoxActive]}>
                  <Ionicons name={LEVEL_ICONS[value]} size={22} color={active ? theme.colors.text : theme.colors.iconMuted} />
                </View>
                <View style={s.cardText}>
                  <Text style={[s.cardName, active && s.cardNameActive]}>{t(`onboarding.level.${value}.name`)}</Text>
                  <Text style={[s.cardDesc, active && s.cardDescActive]}>{t(`onboarding.level.${value}.desc`)}</Text>
                </View>
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
  list:         { gap: theme.spacing.sm },
  card:         { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.lg, padding: theme.spacing.md },
  cardActive:   { backgroundColor: theme.colors.accent },
  iconBox:      { width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.colors.bgSurface, alignItems: 'center', justifyContent: 'center' },
  iconBoxActive:{ backgroundColor: 'rgba(255,255,255,0.2)' },
  cardText:     { flex: 1 },
  cardName:     { ...theme.font.body, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
  cardNameActive: { color: theme.colors.text },
  cardDesc:     { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family, marginTop: 2 },
  cardDescActive: { color: 'rgba(255,255,255,0.7)' },
  btn:          { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.sm },
  btnText:      { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
});
