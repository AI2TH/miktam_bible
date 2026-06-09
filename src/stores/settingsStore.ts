import { create } from 'zustand';
import { safeStorage as storage } from '../utils/storage';

interface SettingsState {
  themeMode: 'light' | 'dark' | 'system';
  preferredVersion: string;
  preferredLanguage: string;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;

  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setPreferredVersion: (version: string) => void;
  setPreferredLanguage: (lang: string) => void;
  setReminder: (enabled: boolean, hour: number, minute: number) => void;
  hydrate: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  themeMode: 'system',
  preferredVersion: 'kjv',
  preferredLanguage: 'en',
  reminderEnabled: false,
  reminderHour: 8,
  reminderMinute: 0,

  setThemeMode: (mode) => {
    storage.set('themeMode', mode);
    set({ themeMode: mode });
  },
  setPreferredVersion: (version) => {
    storage.set('preferredVersion', version);
    set({ preferredVersion: version });
  },
  setPreferredLanguage: (lang) => {
    storage.set('preferredLanguage', lang);
    set({ preferredLanguage: lang });
  },
  setReminder: (enabled, hour, minute) => {
    storage.set('reminderEnabled', enabled);
    storage.set('reminderHour', hour);
    storage.set('reminderMinute', minute);
    set({ reminderEnabled: enabled, reminderHour: hour, reminderMinute: minute });
  },
  hydrate: () => {
    try {
      const mode = storage.getString('themeMode') as 'light' | 'dark' | 'system' | undefined;
      const version = storage.getString('preferredVersion');
      const lang = storage.getString('preferredLanguage');
      const enabled = storage.getBoolean('reminderEnabled');
      const hour = storage.getNumber('reminderHour');
      const minute = storage.getNumber('reminderMinute');

      set({
        themeMode: mode || 'system',
        preferredVersion: version || 'kjv',
        preferredLanguage: lang || 'en',
        reminderEnabled: enabled ?? false,
        reminderHour: hour ?? 8,
        reminderMinute: minute ?? 0,
      });
      console.log('[SettingsStore] Settings successfully hydrated from storage');
    } catch (e) {
      console.error('[SettingsStore] Hydration failed:', e);
    }
  }
}));
