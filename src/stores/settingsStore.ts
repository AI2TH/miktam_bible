import { create } from 'zustand';
import { safeStorage as storage } from '../utils/storage';

interface SettingsState {
  themeMode: 'light' | 'dark' | 'system';
  preferredVersion: string;
  preferredLanguage: string;

  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setPreferredVersion: (version: string) => void;
  setPreferredLanguage: (lang: string) => void;
  hydrate: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  themeMode: 'system',
  preferredVersion: 'kjv',
  preferredLanguage: 'en',

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
  hydrate: () => {
    try {
      const mode = storage.getString('themeMode') as 'light' | 'dark' | 'system' | undefined;
      const version = storage.getString('preferredVersion');
      const lang = storage.getString('preferredLanguage');

      set({
        themeMode: mode || 'system',
        preferredVersion: version || 'kjv',
        preferredLanguage: lang || 'en',
      });
      console.log('[SettingsStore] Settings successfully hydrated from storage');
    } catch (e) {
      console.error('[SettingsStore] Hydration failed:', e);
    }
  }
}));
