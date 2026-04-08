import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const handleLogout = async () => {
    await useAuthStore.getState().logout();
    router.replace('/(auth)/login');
  };

  const handleResetOnboarding = async () => {
    await AsyncStorage.multiRemove([
      'onboarding_complete',
      'onboarding_data',
      'guest_active_task',
      'locale',
    ]);
    router.replace('/(onboarding)/welcome');
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t('profile.title', { defaultValue: 'Профиль' })}</Text>
      </View>
      <View style={s.center}>
        <View style={s.avatar}>
          <Ionicons name="person-outline" size={48} color={theme.colors.iconMuted} />
        </View>
        {isAuthenticated ? (
          <TouchableOpacity style={s.btn} activeOpacity={0.8} onPress={handleLogout}>
            <Text style={s.btnText}>{t('profile.logout', { defaultValue: 'Выйти' })}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={s.btn}
            activeOpacity={0.8}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={s.btnText}>{t('auth.login.submit')}</Text>
          </TouchableOpacity>
        )}

        {__DEV__ && (
          <TouchableOpacity style={s.devBtn} activeOpacity={0.8} onPress={handleResetOnboarding}>
            <Text style={s.devBtnText}>🔄 Сбросить онбординг</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header:    { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl },
  title:     { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg },
  avatar:    { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.bgSurface, alignItems: 'center', justifyContent: 'center' },
  btn:       { backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md },
  btnText:   { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
  devBtn:    { borderWidth: 1, borderColor: theme.colors.separator, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm },
  devBtnText:{ ...theme.font.bodySmall, color: theme.colors.textMuted, fontFamily: theme.font.family },
});
