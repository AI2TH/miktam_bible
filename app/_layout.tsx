import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { initDatabase } from '../src/services/database';
import { initSafeStorage } from '../src/utils/storage';
import { useSettingsStore } from '../src/stores/settingsStore';

LogBox.ignoreAllLogs();
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Outfit: require('../assets/fonts/Outfit-Regular.ttf'),
    'Outfit-Medium': require('../assets/fonts/Outfit-Medium.ttf'),
    'Outfit-SemiBold': require('../assets/fonts/Outfit-SemiBold.ttf'),
    'Outfit-Bold': require('../assets/fonts/Outfit-Bold.ttf'),
    SourceSerif4: require('../assets/fonts/SourceSerif4-Regular.ttf'),
    'SourceSerif4-SemiBold': require('../assets/fonts/SourceSerif4-SemiBold.ttf'),
  });

  useEffect(() => {
    console.log('[RootLayout] Initializing database and storage...');
    async function init() {
      try {
        await initSafeStorage();
        useSettingsStore.getState().hydrate();
        await initDatabase();
        console.log('[RootLayout] Database and storage initialization complete');
        setDbInitialized(true);
      } catch (e) {
        console.error('[RootLayout] Initialization failed:', e);
      }
    }
    init();
  }, []);

  useEffect(() => {
    console.log('[RootLayout] Status changed:', { fontsLoaded, fontError, dbInitialized });
    if (fontsLoaded && dbInitialized) {
      console.log('[RootLayout] Hiding splash screen');
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, dbInitialized]);

  if (!fontsLoaded || !dbInitialized) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recordings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="bookmarks" options={{ presentation: 'modal' }} />
        <Stack.Screen name="concordance/[strongsNumber]" options={{ presentation: 'card' }} />
        <Stack.Screen name="concordance/search" options={{ presentation: 'card' }} />
      </Stack>
    </>
  );
}
