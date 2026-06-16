import AsyncStorage from '@react-native-async-storage/async-storage';

let mmkvInstance: any = null;
const memoryCache: Record<string, any> = {};
let isInitialized = false;

const SETTINGS_KEYS = [
  'themeMode',
  'preferredVersion',
  'preferredLanguage',
  'reminderEnabled',
  'reminderHour',
  'reminderMinute'
];

// Attempt to initialize MMKV
try {
  const { MMKV } = require('react-native-mmkv');
  mmkvInstance = new MMKV();
  console.log('[Storage] MMKV successfully initialized.');
} catch (error) {
  console.warn('[Storage] MMKV not available, will fall back to AsyncStorage:', error);
}

/**
 * Initialize the storage system.
 * If MMKV is active, this is a no-op.
 * If we are in fallback mode, this pre-loads all settings from AsyncStorage into memory
 * before the app completes loading in RootLayout, maintaining synchronous Zustand state.
 */
export async function initSafeStorage(): Promise<void> {
  if (isInitialized) return;

  if (mmkvInstance) {
    isInitialized = true;
    return;
  }

  console.log('[Storage] Pre-loading settings from AsyncStorage...');
  try {
    const pairs = await AsyncStorage.multiGet(SETTINGS_KEYS);
    for (const [key, value] of pairs) {
      if (value !== null) {
        if (key === 'reminderEnabled') {
          memoryCache[key] = value === 'true';
        } else if (key === 'reminderHour' || key === 'reminderMinute') {
          memoryCache[key] = parseInt(value, 10);
        } else {
          memoryCache[key] = value;
        }
      }
    }
    console.log('[Storage] Pre-loaded settings:', memoryCache);
  } catch (error) {
    console.error('[Storage] Error pre-loading settings from AsyncStorage:', error);
  }

  isInitialized = true;
}

export const safeStorage = {
  getString(key: string): string | undefined {
    if (mmkvInstance) {
      try {
        return mmkvInstance.getString(key);
      } catch (e) {
        console.error('[Storage] MMKV getString failed, falling back:', e);
      }
    }
    return memoryCache[key];
  },

  getBoolean(key: string): boolean | undefined {
    if (mmkvInstance) {
      try {
        return mmkvInstance.getBoolean(key);
      } catch (e) {
        console.error('[Storage] MMKV getBoolean failed, falling back:', e);
      }
    }
    return memoryCache[key];
  },

  getNumber(key: string): number | undefined {
    if (mmkvInstance) {
      try {
        return mmkvInstance.getNumber(key);
      } catch (e) {
        console.error('[Storage] MMKV getNumber failed, falling back:', e);
      }
    }
    return memoryCache[key];
  },

  set(key: string, value: string | boolean | number): void {
    if (mmkvInstance) {
      try {
        mmkvInstance.set(key, value);
        return;
      } catch (e) {
        console.error('[Storage] MMKV set failed, writing to fallback:', e);
      }
    }

    // Fallback path: update memory cache and save to AsyncStorage
    memoryCache[key] = value;
    AsyncStorage.setItem(key, String(value)).catch((error) => {
      console.error(`[Storage] Failed to save ${key} to AsyncStorage:`, error);
    });
  }
};
