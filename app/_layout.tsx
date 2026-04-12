import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import i18n from '@/lib/i18n';
import { theme } from '@/constants/theme';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<string>('(onboarding)');

  useEffect(() => {
    (async () => {
      // Restore locale
      const savedLocale = await AsyncStorage.getItem('locale');
      if (savedLocale === 'ru' || savedLocale === 'en') {
        await i18n.changeLanguage(savedLocale);
      }

      // Determine initial route
      const onboardingDone = await AsyncStorage.getItem('onboarding_complete');
      if (!onboardingDone) {
        setInitialRoute('(onboarding)');
      } else {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (refreshToken) {
          setInitialRoute('(tabs)');
        } else {
          // Onboarding done but not logged in — go to tabs as guest
          setInitialRoute('(tabs)');
        }
      }

      setIsReady(true);
    })();
  }, []);

  if (!isReady) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack initialRouteName={initialRoute}>
        <Stack.Screen name="index"               options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/register"     options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login"        options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)"        options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"              options={{ headerShown: false }} />
        <Stack.Screen name="paywall"             options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' },
});
