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
import { api } from '@/lib/api/client';
import { profileApi } from '@/lib/api/profile';
import { useProfileStore } from '@/store/profile.store';
import { useSubscriptionStore } from '@/store/subscription.store';

interface Props {
  visible:   boolean;
  onClose:   () => void;
  onSuccess: () => void;
}

const PROMO_ERRORS: Record<string, string> = {};

export function PromoCodeSheet({ visible, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const [code,    setCode]    = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const slideAnim   = useRef(new Animated.Value(400)).current;
  const checkScale  = useRef(new Animated.Value(0)).current;
  const checkOpacity= useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setCode(''); setError(null); setSuccess(false);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 400, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  const showSuccessAnimation = () => {
    setSuccess(true);
    Animated.parallel([
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 200 }),
      Animated.timing(checkOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        onSuccess();
        // Reset for next open
        checkScale.setValue(0);
        checkOpacity.setValue(0);
      }, 600);
    });
  };

  const redeem = async () => {
    if (code.trim().length < 4) return;
    setError(null);
    setLoading(true);
    try {
      await api.post('/promo/redeem', { code: code.toUpperCase().trim() });
      // Refresh profile to get updated isPremium
      const res = await profileApi.getProfile();
      useProfileStore.getState().setUser(res.data.data);
      useSubscriptionStore.getState().setIsPremium(res.data.data.isPremium);
      showSuccessAnimation();
    } catch (err: any) {
      const code_ = err?.response?.data?.error?.code as string | undefined;
      setError(t(`promo.errors.${code_}`, t('auth.errors.generic')));
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

            {success ? (
              // ── Success state ──
              <View style={s.successWrap}>
                <Animated.View style={[s.checkCircle, { transform: [{ scale: checkScale }], opacity: checkOpacity }]}>
                  <Ionicons name="checkmark" size={36} color={theme.colors.text} />
                </Animated.View>
                <Text style={s.successText}>{t('promo.successTitle')}</Text>
              </View>
            ) : (
              // ── Input state ──
              <>
                <Text style={s.title}>{t('promo.title')}</Text>
                <Text style={s.subtitle}>{t('promo.subtitle')}</Text>

                <View style={s.inputRow}>
                  <TextInput
                    style={s.input}
                    placeholder={t('promo.placeholder')}
                    placeholderTextColor={theme.colors.textMuted}
                    value={code}
                    onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    autoCapitalize="characters"
                    maxLength={12}
                    editable={!loading}
                    autoFocus
                  />
                </View>

                {error && <Text style={s.error}>{error}</Text>}

                <TouchableOpacity
                  style={[s.btn, code.trim().length < 4 && s.btnDisabled]}
                  activeOpacity={0.8}
                  onPress={redeem}
                  disabled={loading || code.trim().length < 4}
                >
                  {loading
                    ? <ActivityIndicator color={theme.colors.text} />
                    : <Text style={s.btnText}>{t('promo.activate')}</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:       { backgroundColor: theme.colors.bgSurface, borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg, padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.md },
  handle:      { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.bgElevated, alignSelf: 'center', marginBottom: theme.spacing.sm },
  title:       { ...theme.font.displaySm, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
  subtitle:    { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family, marginTop: -theme.spacing.sm },
  inputRow:    { backgroundColor: theme.colors.bgElevated, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, height: 56, justifyContent: 'center' },
  input:       { ...theme.font.body, color: theme.colors.text, fontFamily: theme.font.family, letterSpacing: 3, textAlign: 'center' },
  error:       { ...theme.font.bodySmall, color: '#FF6B6B', fontFamily: theme.font.family, textAlign: 'center' },
  btn:         { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.sm },
  btnDisabled: { opacity: 0.4 },
  btnText:     { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
  // Success
  successWrap: { alignItems: 'center', paddingVertical: theme.spacing.xl, gap: theme.spacing.md },
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  successText: { ...theme.font.displaySm, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
});
