import { useEffect } from 'react';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '@/lib/i18n';
import i18n from '@/lib/i18n';

export const unstable_settings = {
  anchor: '(onboarding)',
};

export default function RootLayout() {
  useEffect(() => {
    AsyncStorage.getItem('locale').then((saved) => {
      if (saved === 'ru' || saved === 'en') {
        i18n.changeLanguage(saved);
      }
    });
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack initialRouteName="(auth)/login">
        <Stack.Screen name="index"               options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/register"     options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login"        options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)"        options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
