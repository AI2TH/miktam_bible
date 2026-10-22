import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { LogBox, View, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { initDatabase } from '../src/services/database';
import { initSafeStorage } from '../src/utils/storage';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useTheme } from '../src/theme';

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

  const [initError, setInitError] = useState<string | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    console.log('[RootLayout] Initializing database and storage...');
    async function init() {
      try {
        await initSafeStorage();
        useSettingsStore.getState().hydrate();
        await initDatabase();
        console.log('[RootLayout] Database and storage initialization complete');
        setDbInitialized(true);
      } catch (e: any) {
        console.error('[RootLayout] Initialization failed:', e);
        setInitError(e?.message || 'Failed to initialize database');
        setDbInitialized(true); // Allow app to mount error view
      }
    }
    init();
  }, []);

  useEffect(() => {
    console.log('[RootLayout] Status changed:', { fontsLoaded, fontError, dbInitialized });
    if ((fontsLoaded || fontError) && dbInitialized) {
      console.log('[RootLayout] Hiding splash screen');
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, dbInitialized]);

  if ((!fontsLoaded && !fontError) || !dbInitialized) {
    return (
      <View style={splashStyles.container}>
        <StatusBar style="light" />
        <View style={splashStyles.content}>
          <Image
            source={require('../assets/splash-icon.png')}
            style={splashStyles.logo}
            resizeMode="contain"
          />
          <Text style={splashStyles.title}>MIKTAM BIBLE</Text>
          <Text style={splashStyles.subtitle}>Scripture • Study • Concordance</Text>
          <ActivityIndicator size="small" color="#C9A55C" style={splashStyles.spinner} />
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recordings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="bookmarks" options={{ presentation: 'modal' }} />
        <Stack.Screen name="studies" options={{ presentation: 'modal' }} />
        <Stack.Screen name="concordance/[strongsNumber]" options={{ presentation: 'card' }} />
        <Stack.Screen name="concordance/search" options={{ presentation: 'card' }} />
      </Stack>
    </>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#C9A55C',
    letterSpacing: 2,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#8A8A9E',
    letterSpacing: 1,
    marginBottom: 28,
  },
  spinner: {
    marginTop: 8,
  },
});
