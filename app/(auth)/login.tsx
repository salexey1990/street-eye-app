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
import { authApi } from '@/lib/api/client';

export default function Login() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('auth.errors.fillFields'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.login({ email, password });
      router.replace('/(tabs)');
    } catch (e: any) {
      const code = e?.response?.data?.error?.message;
      if (code === 'INVALID_CREDENTIALS') setError(t('auth.errors.invalidCredentials'));
      else if (code === 'EMAIL_NOT_VERIFIED') setError(t('auth.errors.emailNotVerified'));
      else if (code === 'RATE_LIMIT_EXCEEDED') setError(t('auth.errors.rateLimitExceeded'));
      else setError(t('auth.errors.noConnection'));
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
            <Text style={s.title}>{t('auth.login.title')}</Text>
            <Text style={s.subtitle}>{t('auth.login.subtitle')}</Text>
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

            <View style={s.field}>
              <Text style={s.label}>{t('auth.login.password')}</Text>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.iconMuted} />
                <TextInput
                  style={[s.input, s.inputFlex]}
                  placeholder="••••••••"
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

            <TouchableOpacity style={s.forgotRow} onPress={() => router.push('/(auth)/forgot-password' as any)}>
              <Text style={s.link}>{t('auth.login.forgot')}</Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color={theme.colors.text} />
                : <Text style={s.btnText}>{t('auth.login.submit')}</Text>
              }
            </TouchableOpacity>

            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>{t('common.or')}</Text>
              <View style={s.dividerLine} />
            </View>

            <View style={s.switchRow}>
              <Text style={s.switchText}>{t('auth.login.noAccount')}</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={s.link}>{t('auth.login.register')}</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex:        { flex: 1 },
  container:   { flex: 1, backgroundColor: theme.colors.bg },
  scroll:      { flexGrow: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.xxl, gap: theme.spacing.xl },
  logo:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  logoText:    { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family },
  tagline:     { ...theme.font.displaySm, color: theme.colors.textSecondary, textAlign: 'center', marginTop: -theme.spacing.md, fontFamily: theme.font.family },
  heading:     { gap: theme.spacing.xs },
  title:       { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family },
  subtitle:    { ...theme.font.displaySm, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  errorText:   { fontSize: 14, color: '#FF6B6B', textAlign: 'center' },
  form:        { gap: theme.spacing.md },
  field:       { gap: theme.spacing.sm },
  label:       { ...theme.font.label, color: theme.colors.text, fontFamily: theme.font.family },
  inputWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.md, height: 52, paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm },
  input:       { flex: 1, ...theme.font.body, color: theme.colors.text, fontFamily: theme.font.family },
  inputFlex:   { flex: 1 },
  forgotRow:   { alignSelf: 'flex-end' },
  link:        { ...theme.font.link, color: theme.colors.accent, fontFamily: theme.font.family },
  actions:     { gap: theme.spacing.lg },
  btn:         { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText:     { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
  divider:     { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.separator },
  dividerText: { fontSize: 13, color: theme.colors.textMuted, fontFamily: theme.font.family },
  switchRow:   { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  switchText:  { ...theme.font.bodySmall, color: theme.colors.textSecondary, fontFamily: theme.font.family },
});
