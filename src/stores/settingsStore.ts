import { create } from 'zustand';
import { safeStorage as storage } from '../utils/storage';
import {
  DEFAULT_DAILY_VERSE_TIME,
  dailyVerseSettingValue,
  resolveDailyVerseTime,
} from '../services/dailyVerse';

interface SettingsState {
  themeMode: 'light' | 'dark' | 'system';
  preferredVersion: string;
  preferredLanguage: string;
  /** 'HH:mm' for the daily verse notification (12:00 AM by default); null means the user turned it off */
  dailyVerseTime: string | null;

  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setPreferredVersion: (version: string) => void;
  setPreferredLanguage: (lang: string) => void;
  setDailyVerseTime: (time: string | null) => void;
  hydrate: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  themeMode: 'system',
  preferredVersion: 'kjv',
  preferredLanguage: 'en',
  dailyVerseTime: DEFAULT_DAILY_VERSE_TIME,

  setThemeMode: (mode) => {
    storage.set('themeMode', mode);
    set({ themeMode: mode });
  },
  setPreferredVersion: (version) => {
    const norm = (version || 'kjv').toLowerCase().trim();
    storage.set('preferredVersion', norm);
    set({ preferredVersion: norm });
  },
  setPreferredLanguage: (lang) => {
    storage.set('preferredLanguage', lang);
    set({ preferredLanguage: lang });
  },
  setDailyVerseTime: (time) => {
    // An explicit choice is stored ('HH:mm' or 'off') so it survives upgrades;
    // nothing stored means the user never chose and gets the 12:00 AM default.
    storage.set('dailyVerseTime', dailyVerseSettingValue(time));
    set({ dailyVerseTime: time || null });
  },
  hydrate: () => {
    try {
      const mode = storage.getString('themeMode') as 'light' | 'dark' | 'system' | undefined;
      const version = storage.getString('preferredVersion');
      const lang = storage.getString('preferredLanguage');
      const dailyVerseTime = storage.getString('dailyVerseTime');

      set({
        themeMode: mode || 'system',
        preferredVersion: version || 'kjv',
        preferredLanguage: lang || 'en',
        // Upgrade path: users who never chose get the 12:00 AM default turned on
        dailyVerseTime: resolveDailyVerseTime(dailyVerseTime),
      });
      console.log('[SettingsStore] Settings successfully hydrated from storage');
    } catch (e) {
      console.error('[SettingsStore] Hydration failed:', e);
    }
  }
}));
