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
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called after successful registration (email sent — user must verify) */
  onSuccess: () => void;
}

export function RegisterSheet({ visible, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      setEmail('');
      setPassword('');
      setError(null);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const isValid = /.+@.+\..+/.test(email) && password.length >= 8;

  const handleRegister = async () => {
    if (!isValid) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      await useAuthStore.getState().register({ email, password });
      onSuccess();
    } catch (e: any) {
      const code = e?.response?.data?.error?.code;
      if (code === 'CONFLICT') {
        setError(t('auth.errors.emailAlreadyExists'));
      } else if (code === 'RATE_LIMIT_EXCEEDED') {
        setError(t('auth.errors.rateLimitExceeded'));
      } else {
        setError(t('auth.errors.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoLogin = () => {
    onClose();
    router.push('/(auth)/login');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.overlay}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.backdrop} />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Close button */}
          <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={theme.colors.iconMuted} />
          </TouchableOpacity>

          {/* Header */}
          <Text style={s.title}>{t('registerSheet.title')}</Text>
          <Text style={s.subtitle}>{t('registerSheet.subtitle')}</Text>

          {/* Error */}
          {error && <Text style={s.error}>{error}</Text>}

          {/* Email */}
          <View style={s.field}>
            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.iconMuted} />
              <TextInput
                style={s.input}
                placeholder="your@email.com"
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Password */}
          <View style={s.field}>
            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.iconMuted} />
              <TextInput
                style={[s.input, s.inputFlex]}
                placeholder={t('auth.register.passwordPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={theme.colors.iconMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Legal */}
          <Text style={s.legal}>{t('registerSheet.legal')}</Text>

          {/* CTA */}
          <TouchableOpacity
            style={[s.btn, (!isValid || loading) && s.btnDisabled]}
            onPress={handleRegister}
            disabled={!isValid || loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={theme.colors.text} />
              : <Text style={s.btnText}>{t('auth.register.submit')}</Text>
            }
          </TouchableOpacity>

          {/* Switch to login */}
          <View style={s.switchRow}>
            <Text style={s.switchText}>{t('auth.register.hasAccount')} </Text>
            <TouchableOpacity onPress={handleGoLogin}>
              <Text style={s.link}>{t('auth.register.login')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:    { flex: 1, justifyContent: 'flex-end' },
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:      { backgroundColor: theme.colors.bgSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing.lg, paddingBottom: 36, gap: theme.spacing.md },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.bgElevated, alignSelf: 'center', marginBottom: 4 },
  closeBtn:   { position: 'absolute', top: 20, right: theme.spacing.lg },
  title:      { ...theme.font.displaySm, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
  subtitle:   { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family, marginTop: -theme.spacing.sm },
  error:      { fontSize: 14, color: '#FF6B6B', fontFamily: theme.font.family },
  field:      { gap: theme.spacing.xs },
  inputWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.md, height: 52, paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm },
  input:      { flex: 1, ...theme.font.body, color: theme.colors.text, fontFamily: theme.font.family },
  inputFlex:  { flex: 1 },
  legal:      { ...theme.font.bodySmall, color: theme.colors.textMuted, fontFamily: theme.font.family, lineHeight: 20 },
  btn:        { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center' },
  btnDisabled:{ opacity: 0.5 },
  btnText:    { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
  switchRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  switchText: { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  link:       { ...theme.font.link, color: theme.colors.accent, fontFamily: theme.font.family },
});
