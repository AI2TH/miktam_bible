export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;

  // Brand
  primary: string;
  primaryMuted: string;
  secondary: string;
  secondaryMuted: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Scripture-specific
  verseNumber: string;
  scriptureText: string;
  jesusWords: string;

  // Semantic
  success: string;
  warning: string;
  error: string;
  info: string;

  // Highlight colors (user bookmarks)
  highlightGold: string;
  highlightBlue: string;
  highlightGreen: string;
  highlightPink: string;
  highlightPurple: string;

  // Borders & Separators
  border: string;
  borderMuted: string;

  // Tab bar
  tabBarBackground: string;
  tabBarActive: string;
  tabBarInactive: string;
}

export const darkColors: ThemeColors = {
  // Backgrounds
  background: '#0F0F14',        // Deep night — main app background
  surface: '#1A1A24',            // Card backgrounds
  surfaceElevated: '#24243A',    // Modals, bottom sheets
  surfaceMuted: '#12121A',       // Subtle section dividers

  // Brand
  primary: '#C9A55C',            // Warm gold — scripture accents, CTAs
  primaryMuted: 'rgba(201,165,92,0.15)', // Gold tint for backgrounds
  secondary: '#7B8CDE',          // Soft lavender — interactive elements
  secondaryMuted: 'rgba(123,140,222,0.15)',

  // Text
  textPrimary: '#E8E6E3',        // Warm white
  textSecondary: '#8A8A9A',      // Muted gray
  textTertiary: '#5A5A6A',       // Very muted
  textInverse: '#0F0F14',        // Dark text on light backgrounds

  // Scripture-specific
  verseNumber: '#C9A55C',        // Gold verse numbers
  scriptureText: '#E8E6E3',      // Main verse text
  jesusWords: '#E07B7B',         // Red-letter edition (optional)

  // Semantic
  success: '#5CB85C',
  warning: '#F0AD4E',
  error: '#D9534F',
  info: '#5BC0DE',

  // Highlight colors (user bookmarks)
  highlightGold: '#FFD700',
  highlightBlue: '#5B9BD5',
  highlightGreen: '#70AD47',
  highlightPink: '#FF6B9D',
  highlightPurple: '#9B59B6',

  // Borders & Separators
  border: '#2A2A3A',
  borderMuted: '#1E1E2E',

  // Tab bar
  tabBarBackground: '#0F0F14',
  tabBarActive: '#C9A55C',
  tabBarInactive: '#5A5A6A',
};

export const lightColors: ThemeColors = {
  background: '#FAF8F5',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F0EDE8',

  primary: '#8B6F3A',
  primaryMuted: 'rgba(139,111,58,0.1)',
  secondary: '#4A5899',
  secondaryMuted: 'rgba(74,88,153,0.1)',

  textPrimary: '#2C2C2C',
  textSecondary: '#6B6B7B',
  textTertiary: '#9B9BAB',
  textInverse: '#FFFFFF',

  verseNumber: '#8B6F3A',
  scriptureText: '#2C2C2C',
  jesusWords: '#C0392B',

  success: '#27AE60',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#3498DB',

  highlightGold: '#FFD700',
  highlightBlue: '#5B9BD5',
  highlightGreen: '#70AD47',
  highlightPink: '#FF6B9D',
  highlightPurple: '#9B59B6',

  border: '#E0DCD7',
  borderMuted: '#EDEBE7',

  tabBarBackground: '#FFFFFF',
  tabBarActive: '#8B6F3A',
  tabBarInactive: '#9B9BAB',
};

/** All 5 bookmark highlight colors */
export const HIGHLIGHT_COLORS = [
  { name: 'Gold', value: '#FFD700' },
  { name: 'Blue', value: '#5B9BD5' },
  { name: 'Green', value: '#70AD47' },
  { name: 'Pink', value: '#FF6B9D' },
  { name: 'Purple', value: '#9B59B6' },
] as const;
