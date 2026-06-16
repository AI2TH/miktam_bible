/** Font families — load via expo-font in root _layout.tsx */
export const fonts = {
  heading: 'Outfit',         // Modern geometric sans — headings, UI
  scripture: 'SourceSerif4', // Elegant serif — Bible text
  body: 'Outfit',            // Same as heading for consistency
  mono: 'JetBrainsMono',     // Code/Strong's numbers
} as const;

/** Font weights mapped to Outfit/SourceSerif4 variants */
export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Typography scale — use these named presets everywhere */
export const textStyles = {
  h1: { fontFamily: fonts.heading, fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontFamily: fonts.heading, fontSize: 22, fontWeight: '600' as const, lineHeight: 28 },
  h3: { fontFamily: fonts.heading, fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySmall: { fontFamily: fonts.body, fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  button: { fontFamily: fonts.body, fontSize: 15, fontWeight: '500' as const, lineHeight: 20 },
  scripture: { fontFamily: fonts.scripture, fontSize: 18, fontWeight: '400' as const, lineHeight: 32 },
  scriptureSmall: { fontFamily: fonts.scripture, fontSize: 15, fontWeight: '400' as const, lineHeight: 26 },
  scriptureLarge: { fontFamily: fonts.scripture, fontSize: 22, fontWeight: '400' as const, lineHeight: 38 },
  verseNumber: { fontFamily: fonts.body, fontSize: 12, fontWeight: '700' as const, lineHeight: 18 },
  strongsNumber: { fontFamily: fonts.mono, fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  originalLanguage: { fontFamily: fonts.body, fontSize: 20, fontWeight: '400' as const, lineHeight: 28 },
  transliteration: { fontFamily: fonts.body, fontSize: 13, fontWeight: '400' as const, lineHeight: 18, fontStyle: 'italic' as const },
} as const;

/** User-adjustable scripture font size range */
export const SCRIPTURE_FONT_RANGE = { min: 14, max: 28, default: 18, step: 2 } as const;
