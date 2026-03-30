import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export const unstable_settings = {
  anchor: '(auth)/register',
};

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <Stack initialRouteName="(auth)/login">
        <Stack.Screen name="index"           options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login"    options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
