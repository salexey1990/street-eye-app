import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_complete').then((done) => {
      setRoute(done === 'true' ? '/(tabs)' : '/(onboarding)');
    });
  }, []);

  if (!route) return null;
  return <Redirect href={route as any} />;
}
