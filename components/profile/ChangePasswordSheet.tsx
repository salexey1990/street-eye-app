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
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';
import { useProfileStore } from '@/store/profile.store';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChangePasswordSheet({ visible, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const changePassword = useProfileStore((s) => s.changePassword);
  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      setCurrent(''); setNext(''); setConfirm(''); setError(null);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 500, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  const submit = async () => {
    setError(null);
    if (!current || !next || !confirm) {
      setError(t('auth.errors.fillFields'));
      return;
    }
    if (next.length < 8) {
      setError(t('auth.errors.passwordTooShort'));
      return;
    }
    if (next !== confirm) {
      setError(t('auth.errors.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await changePassword(current, next);
      onSuccess();
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'INVALID_CREDENTIALS') {
        setError(t('profile.password.errorWrongCurrent'));
      } else {
        setError(t('auth.errors.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={s.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={s.handle} />
          <Text style={s.title}>{t('profile.password.title')}</Text>

          {/* Current password */}
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder={t('profile.password.current')}
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={!showCur}
              value={current}
              onChangeText={setCurrent}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowCur((v) => !v)} hitSlop={8}>
              <Ionicons name={showCur ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.iconMuted} />
            </TouchableOpacity>
          </View>

          {/* New password */}
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder={t('profile.password.new')}
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={!showNew}
              value={next}
              onChangeText={setNext}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowNew((v) => !v)} hitSlop={8}>
              <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.iconMuted} />
            </TouchableOpacity>
          </View>

          {/* Confirm */}
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder={t('auth.register.confirmPassword')}
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
              editable={!loading}
            />
          </View>

          {error && <Text style={s.error}>{error}</Text>}

          <TouchableOpacity style={s.btn} activeOpacity={0.8} onPress={submit} disabled={loading}>
            {loading
              ? <ActivityIndicator color={theme.colors.text} />
              : <Text style={s.btnText}>{t('profile.password.submit')}</Text>
            }
          </TouchableOpacity>
        </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:    { backgroundColor: theme.colors.bgSurface, borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg, padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.md },
  handle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.bgElevated, alignSelf: 'center', marginBottom: theme.spacing.sm },
  title:    { ...theme.font.displaySm, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
  inputWrap:{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, height: 52 },
  input:    { flex: 1, ...theme.font.body, color: theme.colors.text, fontFamily: theme.font.family },
  error:    { ...theme.font.bodySmall, color: '#FF6B6B', fontFamily: theme.font.family },
  btn:      { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.sm },
  btnText:  { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
});
