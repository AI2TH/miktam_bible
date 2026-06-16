import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from './colors';
import { textStyles, fonts, SCRIPTURE_FONT_RANGE } from './typography';
import { spacing, borderRadius, shadows } from './spacing';
import { useSettingsStore } from '../stores/settingsStore';

export type Theme = {
  colors: ThemeColors;
  textStyles: typeof textStyles;
  fonts: typeof fonts;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  scriptureFontRange: typeof SCRIPTURE_FONT_RANGE;
  isDark: boolean;
};

export function useTheme(): Theme {
  const colorScheme = useColorScheme();
  const themeMode = useSettingsStore(s => s.themeMode);

  // If themeMode is system, default to system colorScheme, otherwise use the mode
  const isDark = themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  return {
    colors: isDark ? darkColors : lightColors,
    textStyles,
    fonts,
    spacing,
    borderRadius,
    shadows,
    scriptureFontRange: SCRIPTURE_FONT_RANGE,
    isDark,
  };
}

export { darkColors, lightColors, textStyles, fonts, spacing, borderRadius, shadows };
