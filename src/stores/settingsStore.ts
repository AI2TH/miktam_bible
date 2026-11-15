import { create } from 'zustand';
import { safeStorage as storage } from '../utils/storage';

interface SettingsState {
  themeMode: 'light' | 'dark' | 'system';
  preferredVersion: string;
  preferredLanguage: string;
  /** 'HH:mm' for the daily verse notification; null means off (no default time) */
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
  dailyVerseTime: null,

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
    // Stored as '' when off: the storage layer has no delete
    storage.set('dailyVerseTime', time || '');
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
        dailyVerseTime: dailyVerseTime || null,
      });
      console.log('[SettingsStore] Settings successfully hydrated from storage');
    } catch (e) {
      console.error('[SettingsStore] Hydration failed:', e);
    }
  }
}));
