import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';

export default function Register() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!/.+@.+\..+/.test(email)) return t('auth.errors.invalidEmail');
    if (password.length < 8) return t('auth.errors.passwordTooShort');
    if (password !== confirmPassword) return t('auth.errors.passwordMismatch');
    if (!accepted) return t('auth.errors.acceptTerms');
    return null;
  };

  const handleRegister = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError(null);
    try {
      await useAuthStore.getState().register({ email, password });
      router.push('/(auth)/email-verify' as any);
    } catch (e: any) {
      const code = e?.response?.data?.error?.code;
      if (code === 'CONFLICT') setError(t('auth.errors.emailAlreadyExists'));
      else if (code === 'RATE_LIMIT_EXCEEDED') setError(t('auth.errors.rateLimitExceeded'));
      else setError(t('auth.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.logo}>
            <Ionicons name="aperture" size={28} color={theme.colors.accent} />
            <Text style={s.logoText}>StreetEye</Text>
          </View>
          <Text style={s.tagline}>{t('common.appTagline')}</Text>

          {/* Heading */}
          <View style={s.heading}>
            <Text style={s.title}>{t('auth.register.title')}</Text>
            <Text style={s.subtitle}>{t('auth.register.subtitle')}</Text>
          </View>

          {/* Error */}
          {error && <Text style={s.errorText}>{error}</Text>}

          {/* Form */}
          <View style={s.form}>
            <View style={s.field}>
              <Text style={s.label}>Email</Text>
              <View style={s.inputWrap}>
                <Ionicons name="mail-outline" size={20} color={theme.colors.iconMuted} />
                <TextInput
                  style={s.input}
                  placeholder="example@email.com"
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

            <View style={s.field}>
              <Text style={s.label}>{t('auth.register.password')}</Text>
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
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={theme.colors.iconMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>{t('auth.register.confirmPassword')}</Text>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.iconMuted} />
                <TextInput
                  style={[s.input, s.inputFlex]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowConfirm(v => !v)} hitSlop={8}>
                  <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={20} color={theme.colors.iconMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Checkbox */}
            <TouchableOpacity style={s.checkboxRow} onPress={() => setAccepted(v => !v)} activeOpacity={0.7}>
              <View style={[s.checkbox, accepted && s.checkboxChecked]}>
                {accepted && <Ionicons name="checkmark" size={14} color={theme.colors.text} />}
              </View>
              <Text style={s.checkboxLabel}>{t('auth.register.termsAccept')}</Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color={theme.colors.text} />
                : <Text style={s.btnText}>{t('auth.register.submit')}</Text>
              }
            </TouchableOpacity>

            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>{t('common.or')}</Text>
              <View style={s.dividerLine} />
            </View>

            <View style={s.switchRow}>
              <Text style={s.switchText}>{t('auth.register.hasAccount')}</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={s.link}>{t('auth.register.login')}</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex:           { flex: 1 },
  container:      { flex: 1, backgroundColor: theme.colors.bg },
  scroll:         { flexGrow: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.xxl, gap: theme.spacing.xl },
  logo:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  logoText:       { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family },
  tagline:        { ...theme.font.displaySm, color: theme.colors.textSecondary, textAlign: 'center', marginTop: -theme.spacing.md, fontFamily: theme.font.family },
  heading:        { gap: theme.spacing.xs },
  title:          { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family },
  subtitle:       { ...theme.font.displaySm, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  errorText:      { fontSize: 14, color: '#FF6B6B', textAlign: 'center' },
  form:           { gap: theme.spacing.md },
  field:          { gap: theme.spacing.sm },
  label:          { ...theme.font.label, color: theme.colors.text, fontFamily: theme.font.family },
  inputWrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.md, height: 52, paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm },
  input:          { flex: 1, ...theme.font.body, color: theme.colors.text, fontFamily: theme.font.family },
  inputFlex:      { flex: 1 },
  checkboxRow:    { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  checkbox:       { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: theme.colors.separator, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked:{ backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  checkboxLabel:  { flex: 1, ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  link:           { ...theme.font.link, color: theme.colors.accent, fontFamily: theme.font.family },
  actions:        { gap: theme.spacing.lg },
  btn:            { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center' },
  btnDisabled:    { opacity: 0.6 },
  btnText:        { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
  divider:        { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  dividerLine:    { flex: 1, height: 1, backgroundColor: theme.colors.separator },
  dividerText:    { fontSize: 13, color: theme.colors.textMuted, fontFamily: theme.font.family },
  switchRow:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  switchText:     { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },
});
