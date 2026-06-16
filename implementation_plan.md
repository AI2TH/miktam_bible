# 📖 Bible App — Code-Ready Implementation Plan

> **Version**: 4.0 · **Date**: June 3, 2026
> **Purpose**: Hand this file to Gemini (or any AI) to write ALL the code.
> Every section contains exact packages, file paths, code snippets, and SQL.

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Configuration Files](#2-configuration-files)
3. [Design System](#3-design-system)
4. [TypeScript Types](#4-typescript-types)
5. [Database Schema & Setup](#5-database-schema--setup)
6. [Service Layer](#6-service-layer)
7. [Concordance & Original Languages](#7-concordance--original-languages)
8. [AI Engine (On-Device)](#8-ai-engine-on-device)
9. [Zustand Stores](#9-zustand-stores)
10. [Screens & Navigation](#10-screens--navigation)
11. [Reusable Components](#11-reusable-components)
12. [Custom Hooks](#12-custom-hooks)
13. [Build-Time Scripts](#13-build-time-scripts)
14. [Bible SLM Fine-Tuning](#14-bible-slm-fine-tuning)
15. [Deployment & Launch](#15-deployment--launch)
16. [Testing](#16-testing)
17. [Appendix](#17-appendix)

---

## 1. Project Setup

### 1.1 Scaffolding Commands

```bash
# Step 1: Create Expo project
npx create-expo-app@latest bible-app --template blank-typescript
cd bible-app

# Step 2: Install ALL dependencies (run as single command)
npx expo install \
  expo-router@~4 \
  expo-sqlite@~15 \
  expo-file-system@~18 \
  expo-av@~14 \
  expo-notifications@~0.29 \
  expo-sharing@~12 \
  expo-haptics@~13 \
  expo-font@~13 \
  expo-splash-screen@~0.29 \
  expo-constants@~17 \
  expo-device@~7 \
  expo-status-bar@~2 \
  react-native-reanimated@~3.16 \
  react-native-gesture-handler@~2.20 \
  react-native-safe-area-context@~4.14 \
  react-native-screens@~4.4 \
  react-native-svg@~15.8 \
  react-native-view-shot@~4.0 \
  @react-native-async-storage/async-storage@~2.1

# Step 3: Install non-Expo dependencies
npm install \
  zustand@^5.0.0 \
  react-native-mmkv@^3.1.0 \
  uuid@^11.0.0 \
  date-fns@^4.1.0 \
  zod@^3.24.0 \
  @supabase/supabase-js@^2.47.0

# Step 4: Install AI packages (native modules)
npm install \
  llama.rn@^0.5.0 \
  whisper.rn@^0.4.0

# Step 5: Install dev dependencies
npm install -D \
  @types/uuid@^10.0.0 \
  jest@^29.7.0 \
  @testing-library/react-native@^12.0.0 \
  typescript@~5.6.0
```

### 1.2 Exact npm Package List

| Package | Version | Purpose |
|---------|---------|---------|
| `expo` | ~53.0.0 | Core framework |
| `expo-router` | ~4.0.0 | File-based routing |
| `expo-sqlite` | ~15.0.0 | Local SQLite database |
| `expo-file-system` | ~18.0.0 | File I/O for model downloads |
| `expo-av` | ~14.0.0 | Audio recording & playback |
| `expo-notifications` | ~0.29.0 | Local push notifications |
| `expo-sharing` | ~12.0.0 | Share to other apps |
| `expo-haptics` | ~13.0.0 | Haptic feedback |
| `expo-font` | ~13.0.0 | Custom font loading |
| `expo-splash-screen` | ~0.29.0 | Splash screen control |
| `expo-constants` | ~17.0.0 | App constants |
| `expo-device` | ~7.0.0 | Device info (RAM detection) |
| `expo-status-bar` | ~2.0.0 | Status bar styling |
| `react-native-reanimated` | ~3.16.0 | Animations |
| `react-native-gesture-handler` | ~2.20.0 | Gestures (swipe chapters) |
| `react-native-safe-area-context` | ~4.14.0 | Safe area insets |
| `react-native-screens` | ~4.4.0 | Native screen containers |
| `react-native-svg` | ~15.8.0 | SVG icons |
| `react-native-view-shot` | ~4.0.0 | Screenshot for share cards |
| `react-native-mmkv` | ^3.1.0 | Ultra-fast key-value store |
| `zustand` | ^5.0.0 | State management |
| `uuid` | ^11.0.0 | Generate unique IDs |
| `date-fns` | ^4.1.0 | Date utilities |
| `zod` | ^3.24.0 | Schema validation |
| `@supabase/supabase-js` | ^2.47.0 | Optional cloud sync |
| `llama.rn` | ^0.5.0 | On-device LLM (llama.cpp bindings) |
| `whisper.rn` | ^0.4.0 | On-device speech-to-text |

### 1.3 Folder Structure

```
bible-app/
├── app/                              # Expo Router screens
│   ├── _layout.tsx                   # Root layout (fonts, splash, providers)
│   ├── (tabs)/                       # Tab navigator
│   │   ├── _layout.tsx               # Tab bar config (5 tabs)
│   │   ├── index.tsx                 # Home (VOTD, continue reading)
│   │   ├── read/                     # Scripture reading stack
│   │   │   ├── _layout.tsx           # Stack navigator for read flow
│   │   │   ├── index.tsx             # Book picker (66 books grid)
│   │   │   ├── [book].tsx            # Chapter list for selected book
│   │   │   └── [book]/[chapter].tsx  # Verse reader (main reading screen)
│   │   ├── search.tsx                # Unified search (FTS + AI)
│   │   ├── calendar.tsx              # Reading calendar + streaks
│   │   └── profile.tsx               # Settings, downloads, account
│   ├── chat.tsx                      # AI Bible chat (full screen)
│   ├── recordings.tsx                # Voice recordings list
│   ├── concordance/                  # Concordance screens
│   │   ├── [strongsNumber].tsx       # Strong's word detail screen
│   │   └── search.tsx                # Search Strong's definitions
│   └── bookmarks.tsx                 # Bookmarks list screen
│
├── src/
│   ├── components/
│   │   ├── ui/                       # Design system primitives
│   │   │   ├── Button.tsx            # Themed button (primary/secondary/ghost)
│   │   │   ├── Card.tsx              # Surface card with elevation
│   │   │   ├── Text.tsx              # Themed text (h1/h2/body/caption/scripture)
│   │   │   ├── BottomSheet.tsx       # Modal bottom sheet
│   │   │   ├── IconButton.tsx        # Circular icon button
│   │   │   ├── Badge.tsx             # Color badge/chip
│   │   │   ├── ProgressBar.tsx       # Download progress bar
│   │   │   ├── Skeleton.tsx          # Loading skeleton
│   │   │   └── Divider.tsx           # Horizontal divider
│   │   │
│   │   ├── scripture/                # Bible-specific components
│   │   │   ├── VerseText.tsx         # Single verse with number, highlight, tap
│   │   │   ├── ChapterView.tsx       # Full chapter (list of VerseText)
│   │   │   ├── InterlinearView.tsx   # Word-by-word Hebrew/Greek display
│   │   │   ├── StrongsPopover.tsx    # Tap word → Strong's definition popup
│   │   │   ├── CrossRefPanel.tsx     # Cross-references grouped by type
│   │   │   ├── ParallelView.tsx      # Side-by-side translation comparison
│   │   │   ├── VerseCard.tsx         # Verse preview card (for search results)
│   │   │   ├── BookGrid.tsx          # Grid of 66 books (OT/NT sections)
│   │   │   ├── ChapterGrid.tsx       # Grid of chapter numbers
│   │   │   ├── VersionPicker.tsx     # Bible version selector dropdown
│   │   │   └── HighlightColorPicker.tsx # 5 color options for bookmarks
│   │   │
│   │   ├── chat/                     # AI chat components
│   │   │   ├── ChatBubble.tsx        # User/AI message bubble
│   │   │   ├── ChatInput.tsx         # Text input with send button
│   │   │   ├── StreamingText.tsx     # Animated token-by-token text
│   │   │   ├── VerseCitation.tsx     # Tappable verse reference pill
│   │   │   └── SuggestedPrompts.tsx  # Empty state suggestions
│   │   │
│   │   ├── calendar/                 # Calendar components
│   │   │   ├── CalendarGrid.tsx      # Month grid with read indicators
│   │   │   ├── StreakBadge.tsx        # Flame icon + day count
│   │   │   └── ReadingStats.tsx      # Weekly/monthly reading summary
│   │   │
│   │   ├── recorder/                 # Voice recording components
│   │   │   ├── RecordButton.tsx      # Large pulsing record button
│   │   │   ├── WaveformView.tsx      # Audio waveform visualization
│   │   │   └── TranscriptView.tsx    # Editable transcript display
│   │   │
│   │   └── shared/                   # Shared layout components
│   │       ├── Header.tsx            # Screen header with back button
│   │       ├── TabBar.tsx            # Custom tab bar
│   │       ├── EmptyState.tsx        # Empty list placeholder
│   │       └── ErrorBoundary.tsx     # Error fallback UI
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useBibleReader.ts         # Chapter navigation, verse selection
│   │   ├── useBookmarks.ts           # Bookmark CRUD
│   │   ├── useNotes.ts               # Note CRUD
│   │   ├── useChat.ts                # AI chat send/stream/cancel
│   │   ├── useConcordance.ts         # Interlinear + Strong's lookup
│   │   ├── useCrossReferences.ts     # Cross-reference queries
│   │   ├── useRecorder.ts            # Audio record/stop/pause
│   │   ├── useSearch.ts              # FTS5 + AI search
│   │   ├── useDownload.ts            # File download with progress
│   │   └── useTheme.ts               # Dark/light theme hook
│   │
│   ├── stores/                       # Zustand state stores
│   │   ├── readerStore.ts            # Current book/chapter/version/fontSize
│   │   ├── settingsStore.ts          # Theme, notifications, font prefs (MMKV)
│   │   ├── chatStore.ts              # Messages, sessions, streaming state
│   │   ├── downloadStore.ts          # Model/Bible download progress
│   │   └── authStore.ts              # Optional Supabase auth state
│   │
│   ├── services/                     # Data access layer (SQLite queries)
│   │   ├── database.ts               # DB init, singleton, PRAGMAs
│   │   ├── bibleService.ts           # Verse/book/chapter queries
│   │   ├── searchService.ts          # FTS5 + hybrid search + RRF
│   │   ├── concordanceService.ts     # Strong's + original words + cross-refs
│   │   ├── bookmarkService.ts        # Bookmark CRUD
│   │   ├── noteService.ts            # Note CRUD with FTS
│   │   ├── readingProgressService.ts # Calendar + streaks
│   │   ├── recordingService.ts       # Voice recording metadata
│   │   ├── syncService.ts            # Optional Supabase sync
│   │   └── notificationService.ts    # Local notification scheduling
│   │
│   ├── ai/                           # On-device AI engine
│   │   ├── modelManager.ts           # Download/delete/list AI models
│   │   ├── llamaEngine.ts            # llama.rn wrapper (load, infer, dispose)
│   │   ├── ragPipeline.ts            # Full RAG: embed→search→prompt→stream
│   │   ├── vectorSearch.ts           # sqlite-vec similarity queries
│   │   ├── whisperEngine.ts          # whisper.rn wrapper
│   │   └── prompts.ts                # System prompts & prompt builders
│   │
│   ├── database/                     # Schema & migrations
│   │   ├── schema.ts                 # All CREATE TABLE statements
│   │   ├── migrations.ts             # Version-based migration runner
│   │   └── seed/                     # Pre-bundled data
│   │       ├── votd-365.json         # 365 verse-of-the-day entries
│   │       └── books.json            # 66 book names/abbreviations
│   │
│   ├── theme/                        # Design system tokens
│   │   ├── colors.ts                 # Dark & light color palettes
│   │   ├── typography.ts             # Font config
│   │   ├── spacing.ts                # 4px grid + common sizes
│   │   └── index.ts                  # Barrel export + ThemeProvider
│   │
│   ├── utils/                        # Pure utility functions
│   │   ├── deviceCapability.ts       # Detect RAM, recommend model tier
│   │   ├── bibleUtils.ts             # Book name lookup, verse ref parsing
│   │   ├── rrfMerge.ts               # Reciprocal Rank Fusion algorithm
│   │   ├── shareUtils.ts             # Share card generation
│   │   ├── dateUtils.ts              # Streak calculation, calendar helpers
│   │   └── constants.ts              # App-wide constants
│   │
│   └── types/                        # TypeScript type definitions
│       ├── bible.ts                  # Verse, Book, BibleVersion, etc.
│       ├── concordance.ts            # OriginalWord, StrongsEntry, CrossRef
│       ├── user.ts                   # Profile, Bookmark, Note, Recording
│       └── ai.ts                     # ChatMessage, AIModel, RAGResult
│
├── scripts/                          # Build-time data scripts (Node.js)
│   ├── import-bible.ts               # Fetch Bible translations → SQLite
│   ├── import-concordance.ts         # Parse OpenGNT + OSHB → SQLite
│   ├── import-crossrefs.ts           # Parse OpenBible.info → SQLite
│   ├── generate-embeddings.py        # Pre-compute verse vectors (Python)
│   └── curate-votd.ts                # Generate 365 VOTD entries
│
├── assets/
│   ├── fonts/                        # Bundled fonts
│   ├── images/                       # App icons, onboarding images
│   └── share-templates/              # Background images for verse cards
│
├── supabase/                         # Optional cloud config
│   ├── migrations/                   # PostgreSQL schema (mirrors local)
│   └── config.toml
│
├── app.json                          # Expo config
├── tsconfig.json                     # TypeScript config
├── eas.json                          # EAS Build config
├── babel.config.js                   # Babel config (reanimated plugin)
├── metro.config.js                   # Metro bundler config
├── package.json
└── README.md
```

---

## 2. Configuration Files

### 2.1 app.json

```json
{
  "expo": {
    "name": "Bible App",
    "slug": "bible-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "bible-app",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0F0F14"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.bibleapp",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "Record voice memos for Bible study reflection.",
        "UIBackgroundModes": ["audio"]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#0F0F14"
      },
      "package": "com.yourname.bibleapp",
      "permissions": ["RECORD_AUDIO", "VIBRATE", "RECEIVE_BOOT_COMPLETED"]
    },
    "plugins": [
      "expo-router",
      "expo-sqlite",
      "expo-font",
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#C9A55C"
        }
      ],
      [
        "expo-av",
        {
          "microphonePermission": "Allow Bible App to record voice memos."
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

### 2.2 tsconfig.json

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@services/*": ["./src/services/*"],
      "@stores/*": ["./src/stores/*"],
      "@ai/*": ["./src/ai/*"],
      "@theme/*": ["./src/theme/*"],
      "@utils/*": ["./src/utils/*"],
      "@types/*": ["./src/types/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

### 2.3 babel.config.js

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

### 2.4 eas.json

```json
{
  "cli": { "version": ">= 13.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 3. Design System

### 3.1 `src/theme/colors.ts`

```typescript
export const darkColors = {
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
} as const;

export const lightColors = {
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
} as const;

export type ThemeColors = typeof darkColors;

/** All 5 bookmark highlight colors */
export const HIGHLIGHT_COLORS = [
  { name: 'Gold', value: '#FFD700' },
  { name: 'Blue', value: '#5B9BD5' },
  { name: 'Green', value: '#70AD47' },
  { name: 'Pink', value: '#FF6B9D' },
  { name: 'Purple', value: '#9B59B6' },
] as const;
```

### 3.2 `src/theme/typography.ts`

```typescript
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
  h1: { fontFamily: fonts.heading, fontSize: 28, fontWeight: '700', lineHeight: 34 },
  h2: { fontFamily: fonts.heading, fontSize: 22, fontWeight: '600', lineHeight: 28 },
  h3: { fontFamily: fonts.heading, fontSize: 18, fontWeight: '600', lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodySmall: { fontFamily: fonts.body, fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, fontWeight: '400', lineHeight: 18 },
  button: { fontFamily: fonts.body, fontSize: 15, fontWeight: '500', lineHeight: 20 },
  scripture: { fontFamily: fonts.scripture, fontSize: 18, fontWeight: '400', lineHeight: 32 },
  scriptureSmall: { fontFamily: fonts.scripture, fontSize: 15, fontWeight: '400', lineHeight: 26 },
  scriptureLarge: { fontFamily: fonts.scripture, fontSize: 22, fontWeight: '400', lineHeight: 38 },
  verseNumber: { fontFamily: fonts.body, fontSize: 12, fontWeight: '700', lineHeight: 18 },
  strongsNumber: { fontFamily: fonts.mono, fontSize: 12, fontWeight: '500', lineHeight: 16 },
  originalLanguage: { fontFamily: fonts.body, fontSize: 20, fontWeight: '400', lineHeight: 28 },
  transliteration: { fontFamily: fonts.body, fontSize: 13, fontWeight: '400', lineHeight: 18, fontStyle: 'italic' as const },
} as const;

/** User-adjustable scripture font size range */
export const SCRIPTURE_FONT_RANGE = { min: 14, max: 28, default: 18, step: 2 } as const;
```

### 3.3 `src/theme/spacing.ts`

```typescript
/** 4px grid system */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

/** Elevation shadows for cards/surfaces */
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
```

### 3.4 `src/theme/index.ts`

```typescript
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from './colors';
import { textStyles, fonts, SCRIPTURE_FONT_RANGE } from './typography';
import { spacing, borderRadius, shadows } from './spacing';

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
  // TODO: also check settingsStore for user override
  const isDark = colorScheme === 'dark';

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
```

---

## 4. TypeScript Types

### 4.1 `src/types/bible.ts`

```typescript
/** A single Bible verse */
export interface Verse {
  id: number;
  versionId: string;         // 'kjv', 'web', 'asv'
  bookNumber: number;        // 1-66
  chapter: number;
  verseNumber: number;
  text: string;
}

/** A book of the Bible */
export interface Book {
  id: number;
  versionId: string;
  bookNumber: number;        // 1=Genesis ... 66=Revelation
  name: string;              // 'Genesis'
  abbreviation: string;      // 'Gen'
  testament: 'OT' | 'NT';
  totalChapters: number;
}

/** A Bible translation/version */
export interface BibleVersion {
  id: string;                // 'kjv'
  name: string;              // 'King James Version'
  language: string;          // 'en'
  isDownloaded: boolean;
  downloadDate: string | null;
  totalSizeMb: number;
}

/** Search result from FTS5 or hybrid search */
export interface SearchResult {
  verse: Verse;
  bookName: string;
  score: number;             // RRF score or FTS rank
  snippet: string;           // Highlighted text snippet
  source: 'fts' | 'vector' | 'hybrid';
}

/** Verse reference for navigation */
export interface VerseRef {
  bookNumber: number;
  chapter: number;
  verseNumber: number;
  versionId?: string;
}
```

### 4.2 `src/types/concordance.ts`

```typescript
/** A single word in the original Hebrew/Greek/Aramaic text */
export interface OriginalWord {
  id: number;
  bookNumber: number;
  chapter: number;
  verseNumber: number;
  wordPosition: number;      // 1-based position within the verse
  originalText: string;      // Hebrew/Greek/Aramaic characters (e.g., "ἀγάπη")
  transliteration: string;   // Romanized (e.g., "agapē")
  strongsNumber: string;     // e.g., "G26" or "H430"
  language: 'hebrew' | 'greek' | 'aramaic';
  morphology: MorphologyData | null;
  gloss: string;             // Short English meaning (e.g., "love")
}

/** Morphological parsing data */
export interface MorphologyData {
  partOfSpeech?: string;     // noun, verb, adjective, etc.
  tense?: string;            // present, aorist, perfect, etc.
  voice?: string;            // active, passive, middle
  mood?: string;             // indicative, subjunctive, imperative, etc.
  case?: string;             // nominative, genitive, dative, accusative
  gender?: string;           // masculine, feminine, neuter
  number?: string;           // singular, plural
  person?: string;           // 1st, 2nd, 3rd
  stem?: string;             // Qal, Niphal, Piel, etc. (Hebrew verb stems)
}

/** Strong's Concordance dictionary entry */
export interface StrongsEntry {
  strongsNumber: string;     // 'G26' or 'H430'
  language: 'greek' | 'hebrew' | 'aramaic';
  originalWord: string;      // Original script characters
  transliteration: string;   // Romanized form
  pronunciation: string;     // Phonetic pronunciation
  definition: string;        // Full English definition
  shortDefinition: string;   // One-line summary
  usageCount: number;        // How many times in Bible
  kjvTranslations: string[]; // English words used in KJV
}

/** Cross-reference link between two passages */
export interface CrossReference {
  id: number;
  sourceBook: number;
  sourceChapter: number;
  sourceVerseStart: number;
  sourceVerseEnd: number | null;
  targetBook: number;
  targetChapter: number;
  targetVerseStart: number;
  targetVerseEnd: number | null;
  relationshipType: 'quotation' | 'parallel' | 'allusion' | 'thematic';
  confidence: number;        // 0.0 - 1.0
  votes: number;             // From OpenBible.info community
}

/** Cross-ref with resolved target verse text for display */
export interface CrossReferenceWithText extends CrossReference {
  targetText: string;
  targetBookName: string;
  targetLabel: string;       // e.g., "John 3:16" or "Romans 8:28-30"
}
```

### 4.3 `src/types/user.ts`

```typescript
export interface Profile {
  id: string;                // 'local_user' by default
  displayName: string;
  preferredVersion: string;  // 'kjv'
  preferredLanguage: string; // 'en'
  syncEnabled: boolean;
  remoteUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;                // UUID
  versionId: string;
  bookNumber: number;
  chapter: number;
  verseNumber: number;
  highlightColor: string;    // Hex color
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
}

export interface Note {
  id: string;
  versionId: string;
  bookNumber: number;
  chapter: number;
  verseNumber: number | null; // null = chapter-level note
  content: string;            // Rich text (markdown)
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
}

export interface Recording {
  id: string;
  title: string;
  localFilePath: string;      // file:///path/on/device.m4a
  durationSecs: number;
  transcript: string | null;
  transcriptionStatus: 'pending' | 'processing' | 'done' | 'failed';
  linkedBook: number | null;
  linkedChapter: number | null;
  linkedVerse: number | null;
  isSynced: boolean;
  createdAt: string;
}

export interface ReadingProgress {
  id: string;
  versionId: string;
  bookNumber: number;
  chapter: number;
  readDate: string;           // YYYY-MM-DD
  readingTimeSecs: number;
  isSynced: boolean;
}
```

### 4.4 `src/types/ai.ts`

```typescript
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  citedVerses: VerseRef[];    // Parsed verse references in response
  versionId: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;             // Auto-generated from first message
  messageCount: number;
  lastMessageAt: string;
  versionId: string;
}

export interface AIModel {
  id: string;                // 'bibleslm-1.5b-q4', 'bibleslm-0.5b-q4', 'whisper-base-en'
  modelType: 'llm' | 'whisper' | 'embeddings';
  displayName: string;       // 'BibleSLM 1.5B (Full)'
  description: string;       // 'Best quality Bible study assistant'
  fileSizeMb: number;        // 986
  ramRequiredMb: number;     // 1200
  downloadUrl: string;       // HuggingFace URL
  filePath: string | null;   // Local path after download
  isDownloaded: boolean;
  downloadDate: string | null;
  version: string;           // '1.0.0'
}

export interface ModelDownloadProgress {
  modelId: string;
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;        // 0-100
  status: 'idle' | 'downloading' | 'verifying' | 'ready' | 'error';
  error: string | null;
}

export interface RAGResult {
  answer: string;
  citedVerses: VerseRef[];
  sourceVerses: SearchResult[];  // The verses that were fed as context
  tokensGenerated: number;
  inferenceTimeMs: number;
}

/** Chunk emitted during streaming RAG response */
export interface RAGStreamChunk {
  type: 'token' | 'citation' | 'done' | 'error';
  token?: string;            // Next generated token
  citation?: VerseRef;       // Detected verse reference
  fullText?: string;         // Complete text so far
  error?: string;
}

/** Device capability assessment */
export interface DeviceCapability {
  totalRamMb: number;
  availableRamMb: number;
  recommendedTier: 'full' | 'lite' | 'none';
  canRunLlm: boolean;
  canRunWhisper: boolean;
}

import type { VerseRef } from './bible';
```

---

## 5. Database Schema & Setup

### 5.1 `src/database/schema.ts`

```typescript
/**
 * All SQL statements to create the database tables.
 * Run in order — foreign keys depend on prior tables.
 */
export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = [
  // =============================================
  // BIBLE TEXT TABLES
  // =============================================

  `CREATE TABLE IF NOT EXISTS bible_versions (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    language        TEXT NOT NULL DEFAULT 'en',
    is_downloaded   INTEGER DEFAULT 0,
    download_date   TEXT,
    total_size_mb   REAL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS books (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    version_id      TEXT NOT NULL REFERENCES bible_versions(id),
    book_number     INTEGER NOT NULL,
    name            TEXT NOT NULL,
    abbreviation    TEXT NOT NULL,
    testament       TEXT NOT NULL CHECK(testament IN ('OT','NT')),
    total_chapters  INTEGER NOT NULL,
    UNIQUE(version_id, book_number)
  )`,

  `CREATE TABLE IF NOT EXISTS verses (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    version_id      TEXT NOT NULL,
    book_number     INTEGER NOT NULL,
    chapter         INTEGER NOT NULL,
    verse_number    INTEGER NOT NULL,
    text            TEXT NOT NULL,
    UNIQUE(version_id, book_number, chapter, verse_number)
  )`,

  // Full-text search index on verse text
  `CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5(
    text,
    content=verses,
    content_rowid=id,
    tokenize='porter unicode61'
  )`,

  // Triggers to keep FTS in sync with verses table
  `CREATE TRIGGER IF NOT EXISTS verses_ai AFTER INSERT ON verses BEGIN
    INSERT INTO verses_fts(rowid, text) VALUES (new.id, new.text);
  END`,

  `CREATE TRIGGER IF NOT EXISTS verses_ad AFTER DELETE ON verses BEGIN
    INSERT INTO verses_fts(verses_fts, rowid, text) VALUES('delete', old.id, old.text);
  END`,

  `CREATE TRIGGER IF NOT EXISTS verses_au AFTER UPDATE ON verses BEGIN
    INSERT INTO verses_fts(verses_fts, rowid, text) VALUES('delete', old.id, old.text);
    INSERT INTO verses_fts(rowid, text) VALUES (new.id, new.text);
  END`,

  // =============================================
  // CONCORDANCE & ORIGINAL LANGUAGE TABLES
  // =============================================

  `CREATE TABLE IF NOT EXISTS original_words (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    book_number     INTEGER NOT NULL,
    chapter         INTEGER NOT NULL,
    verse_number    INTEGER NOT NULL,
    word_position   INTEGER NOT NULL,
    original_text   TEXT NOT NULL,
    transliteration TEXT,
    strongs_number  TEXT,
    language        TEXT NOT NULL CHECK(language IN ('hebrew','greek','aramaic')),
    morphology      TEXT,
    gloss           TEXT,
    UNIQUE(book_number, chapter, verse_number, word_position)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_original_words_verse
    ON original_words(book_number, chapter, verse_number)`,

  `CREATE INDEX IF NOT EXISTS idx_original_words_strongs
    ON original_words(strongs_number)`,

  `CREATE TABLE IF NOT EXISTS strongs_dictionary (
    strongs_number  TEXT PRIMARY KEY,
    language        TEXT NOT NULL CHECK(language IN ('greek','hebrew','aramaic')),
    original_word   TEXT NOT NULL,
    transliteration TEXT NOT NULL,
    pronunciation   TEXT,
    definition      TEXT NOT NULL,
    short_definition TEXT,
    usage_count     INTEGER DEFAULT 0,
    kjv_translations TEXT
  )`,

  // FTS5 on Strong's definitions for searching "love", "grace", etc.
  `CREATE VIRTUAL TABLE IF NOT EXISTS strongs_fts USING fts5(
    definition,
    short_definition,
    transliteration,
    original_word,
    content=strongs_dictionary,
    content_rowid=rowid,
    tokenize='porter unicode61'
  )`,

  `CREATE TABLE IF NOT EXISTS cross_references (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    source_book         INTEGER NOT NULL,
    source_chapter      INTEGER NOT NULL,
    source_verse_start  INTEGER NOT NULL,
    source_verse_end    INTEGER,
    target_book         INTEGER NOT NULL,
    target_chapter      INTEGER NOT NULL,
    target_verse_start  INTEGER NOT NULL,
    target_verse_end    INTEGER,
    relationship_type   TEXT DEFAULT 'thematic'
                        CHECK(relationship_type IN ('quotation','parallel','allusion','thematic')),
    confidence          REAL DEFAULT 0.5,
    votes               INTEGER DEFAULT 0
  )`,

  `CREATE INDEX IF NOT EXISTS idx_crossref_source
    ON cross_references(source_book, source_chapter, source_verse_start)`,

  `CREATE INDEX IF NOT EXISTS idx_crossref_target
    ON cross_references(target_book, target_chapter, target_verse_start)`,

  // =============================================
  // USER DATA TABLES (all local, zero internet)
  // =============================================

  `CREATE TABLE IF NOT EXISTS profile (
    id              TEXT PRIMARY KEY DEFAULT 'local_user',
    display_name    TEXT DEFAULT 'Reader',
    preferred_version TEXT DEFAULT 'kjv',
    preferred_language TEXT DEFAULT 'en',
    scripture_font_size INTEGER DEFAULT 18,
    sync_enabled    INTEGER DEFAULT 0,
    remote_user_id  TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS bookmarks (
    id              TEXT PRIMARY KEY,
    version_id      TEXT NOT NULL,
    book_number     INTEGER NOT NULL,
    chapter         INTEGER NOT NULL,
    verse_number    INTEGER NOT NULL,
    highlight_color TEXT DEFAULT '#FFD700',
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now')),
    is_synced       INTEGER DEFAULT 0,
    UNIQUE(version_id, book_number, chapter, verse_number)
  )`,

  `CREATE TABLE IF NOT EXISTS notes (
    id              TEXT PRIMARY KEY,
    version_id      TEXT NOT NULL,
    book_number     INTEGER NOT NULL,
    chapter         INTEGER NOT NULL,
    verse_number    INTEGER,
    content         TEXT NOT NULL,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now')),
    is_synced       INTEGER DEFAULT 0
  )`,

  // FTS on notes content for searching within notes
  `CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    content,
    content=notes,
    content_rowid=rowid,
    tokenize='porter unicode61'
  )`,

  `CREATE TABLE IF NOT EXISTS recordings (
    id              TEXT PRIMARY KEY,
    title           TEXT,
    local_file_path TEXT NOT NULL,
    duration_secs   INTEGER DEFAULT 0,
    transcript      TEXT,
    transcription_status TEXT DEFAULT 'pending'
                    CHECK(transcription_status IN ('pending','processing','done','failed')),
    linked_book     INTEGER,
    linked_chapter  INTEGER,
    linked_verse    INTEGER,
    is_synced       INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS verse_calendar (
    id              TEXT PRIMARY KEY,
    source          TEXT DEFAULT 'system',
    version_id      TEXT NOT NULL DEFAULT 'kjv',
    book_number     INTEGER NOT NULL,
    chapter         INTEGER NOT NULL,
    verse_number    INTEGER NOT NULL,
    calendar_type   TEXT NOT NULL CHECK(calendar_type IN ('daily','monthly','yearly')),
    target_date     TEXT NOT NULL,
    created_at      TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS reading_progress (
    id              TEXT PRIMARY KEY,
    version_id      TEXT NOT NULL,
    book_number     INTEGER NOT NULL,
    chapter         INTEGER NOT NULL,
    read_date       TEXT DEFAULT (date('now')),
    reading_time_secs INTEGER DEFAULT 0,
    is_synced       INTEGER DEFAULT 0,
    UNIQUE(version_id, book_number, chapter, read_date)
  )`,

  `CREATE TABLE IF NOT EXISTS chat_history (
    id              TEXT PRIMARY KEY,
    session_id      TEXT NOT NULL,
    role            TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content         TEXT NOT NULL,
    cited_verses    TEXT,
    version_id      TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE INDEX IF NOT EXISTS idx_chat_session
    ON chat_history(session_id, created_at)`,

  `CREATE TABLE IF NOT EXISTS ai_models (
    id              TEXT PRIMARY KEY,
    model_type      TEXT NOT NULL CHECK(model_type IN ('llm','whisper','embeddings')),
    display_name    TEXT NOT NULL,
    description     TEXT,
    file_size_mb    REAL NOT NULL,
    ram_required_mb REAL DEFAULT 0,
    download_url    TEXT NOT NULL,
    file_path       TEXT,
    is_downloaded   INTEGER DEFAULT 0,
    download_date   TEXT,
    version         TEXT DEFAULT '1.0.0'
  )`,

  `CREATE TABLE IF NOT EXISTS sync_queue (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name      TEXT NOT NULL,
    record_id       TEXT NOT NULL,
    action          TEXT NOT NULL CHECK(action IN ('INSERT','UPDATE','DELETE')),
    payload         TEXT NOT NULL,
    created_at      TEXT DEFAULT (datetime('now')),
    synced_at       TEXT
  )`,

  // =============================================
  // SEED DATA
  // =============================================

  // Insert default profile
  `INSERT OR IGNORE INTO profile (id) VALUES ('local_user')`,

  // Register available AI models
  `INSERT OR IGNORE INTO ai_models (id, model_type, display_name, description, file_size_mb, ram_required_mb, download_url, version) VALUES
    ('bibleslm-1.5b-q4', 'llm', 'BibleSLM 1.5B (Full)', 'Best quality Bible study assistant. Recommended for modern phones (3GB+ RAM).', 986, 1200, 'https://huggingface.co/yourname/BibleSLM-1.5B-GGUF/resolve/main/bibleslm-1.5b-q4_k_m.gguf', '1.0.0'),
    ('bibleslm-0.5b-q4', 'llm', 'BibleSLM 0.5B (Lite)', 'Lightweight Bible assistant. Works on older phones (2GB+ RAM).', 400, 600, 'https://huggingface.co/yourname/BibleSLM-0.5B-GGUF/resolve/main/bibleslm-0.5b-q4_k_m.gguf', '1.0.0'),
    ('whisper-base-en', 'whisper', 'Whisper Base (English)', 'Speech-to-text for voice recording transcription.', 140, 200, 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin', '1.0.0')`,
];
```

### 5.2 `src/services/database.ts`

```typescript
import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from '@/database/schema';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the database. Call once at app startup in root _layout.tsx.
 * - Opens (or creates) the SQLite database
 * - Sets performance PRAGMAs
 * - Runs schema creation
 * - Returns the singleton database instance
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('bible.db');

  // Performance PRAGMAs
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = 10000;
    PRAGMA foreign_keys = ON;
    PRAGMA temp_store = MEMORY;
  `);

  // Run all CREATE TABLE statements
  for (const sql of CREATE_TABLES_SQL) {
    await db.execAsync(sql);
  }

  // Set schema version
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);

  console.log('[DB] Database initialized, schema version:', SCHEMA_VERSION);
  return db;
}

/**
 * Get the singleton database instance.
 * Throws if initDatabase() hasn't been called yet.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection. Call on app termination.
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
```

---

## 6. Service Layer

### 6.1 `src/services/bibleService.ts`

```typescript
import { getDatabase } from './database';
import type { Verse, Book, BibleVersion } from '@/types/bible';

// ─── BIBLE VERSIONS ──────────────────────────────

/** Get all registered Bible versions (downloaded or not) */
export async function getAllVersions(): Promise<BibleVersion[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM bible_versions ORDER BY name');
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    language: r.language,
    isDownloaded: r.is_downloaded === 1,
    downloadDate: r.download_date,
    totalSizeMb: r.total_size_mb,
  }));
}

/** Get only downloaded versions */
export async function getDownloadedVersions(): Promise<BibleVersion[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM bible_versions WHERE is_downloaded = 1 ORDER BY name'
  );
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    language: r.language,
    isDownloaded: true,
    downloadDate: r.download_date,
    totalSizeMb: r.total_size_mb,
  }));
}

// ─── BOOKS ───────────────────────────────────────

/** Get all 66 books for a version, ordered by book_number */
export async function getBooks(versionId: string): Promise<Book[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM books WHERE version_id = ? ORDER BY book_number',
    [versionId]
  );
  return rows.map(r => ({
    id: r.id,
    versionId: r.version_id,
    bookNumber: r.book_number,
    name: r.name,
    abbreviation: r.abbreviation,
    testament: r.testament,
    totalChapters: r.total_chapters,
  }));
}

/** Get a single book by number */
export async function getBook(versionId: string, bookNumber: number): Promise<Book | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM books WHERE version_id = ? AND book_number = ?',
    [versionId, bookNumber]
  );
  if (!row) return null;
  return {
    id: row.id,
    versionId: row.version_id,
    bookNumber: row.book_number,
    name: row.name,
    abbreviation: row.abbreviation,
    testament: row.testament,
    totalChapters: row.total_chapters,
  };
}

// ─── VERSES ──────────────────────────────────────

/** Get all verses for a specific chapter */
export async function getChapterVerses(
  versionId: string,
  bookNumber: number,
  chapter: number
): Promise<Verse[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM verses
     WHERE version_id = ? AND book_number = ? AND chapter = ?
     ORDER BY verse_number`,
    [versionId, bookNumber, chapter]
  );
  return rows.map(r => ({
    id: r.id,
    versionId: r.version_id,
    bookNumber: r.book_number,
    chapter: r.chapter,
    verseNumber: r.verse_number,
    text: r.text,
  }));
}

/** Get a single verse */
export async function getVerse(
  versionId: string,
  bookNumber: number,
  chapter: number,
  verseNumber: number
): Promise<Verse | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM verses
     WHERE version_id = ? AND book_number = ? AND chapter = ? AND verse_number = ?`,
    [versionId, bookNumber, chapter, verseNumber]
  );
  if (!row) return null;
  return {
    id: row.id,
    versionId: row.version_id,
    bookNumber: row.book_number,
    chapter: row.chapter,
    verseNumber: row.verse_number,
    text: row.text,
  };
}

/** Get total chapter count for a book */
export async function getChapterCount(versionId: string, bookNumber: number): Promise<number> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ cnt: number }>(
    'SELECT MAX(chapter) as cnt FROM verses WHERE version_id = ? AND book_number = ?',
    [versionId, bookNumber]
  );
  return row?.cnt ?? 0;
}
```

### 6.2 `src/services/searchService.ts`

```typescript
import { getDatabase } from './database';
import { rrfMerge } from '@/utils/rrfMerge';
import { BOOK_NAMES } from '@/utils/constants';
import type { SearchResult } from '@/types/bible';

/**
 * Full-text search using FTS5 with highlighted snippets.
 * Returns ranked results with book name resolved.
 */
export async function searchFTS(
  query: string,
  versionId: string,
  limit: number = 20
): Promise<SearchResult[]> {
  const db = getDatabase();

  // FTS5 search with snippet extraction (30 tokens before/after match)
  const rows = await db.getAllAsync<any>(
    `SELECT v.id, v.version_id, v.book_number, v.chapter, v.verse_number, v.text,
            snippet(verses_fts, 0, '<b>', '</b>', '...', 30) as snippet,
            rank
     FROM verses_fts
     JOIN verses v ON v.id = verses_fts.rowid
     WHERE verses_fts MATCH ? AND v.version_id = ?
     ORDER BY rank
     LIMIT ?`,
    [query, versionId, limit]
  );

  return rows.map((r: any, index: number) => ({
    verse: {
      id: r.id,
      versionId: r.version_id,
      bookNumber: r.book_number,
      chapter: r.chapter,
      verseNumber: r.verse_number,
      text: r.text,
    },
    bookName: BOOK_NAMES[r.book_number] || `Book ${r.book_number}`,
    score: Math.abs(r.rank),
    snippet: r.snippet || r.text.substring(0, 100),
    source: 'fts' as const,
  }));
}

/**
 * Hybrid search: combines FTS5 + vector similarity using RRF.
 * Used by the AI RAG pipeline for best retrieval quality.
 *
 * Steps:
 * 1. Run FTS5 keyword search (top 20)
 * 2. Run sqlite-vec cosine similarity search (top 20)
 * 3. Merge using Reciprocal Rank Fusion (k=60)
 * 4. Return top-K merged results
 */
export async function hybridSearch(
  query: string,
  queryEmbedding: number[],
  versionId: string,
  topK: number = 10
): Promise<SearchResult[]> {
  // Step 1: FTS5 results
  const ftsResults = await searchFTS(query, versionId, 20);

  // Step 2: Vector similarity results (sqlite-vec)
  const db = getDatabase();
  const vectorRows = await db.getAllAsync<any>(
    `SELECT v.id, v.version_id, v.book_number, v.chapter, v.verse_number, v.text,
            ve.distance
     FROM verse_embeddings ve
     JOIN verses v ON v.version_id = ve.version_id
       AND v.book_number = ve.book_number
       AND v.chapter = ve.chapter
       AND v.verse_number = ve.verse_number
     WHERE ve.version_id = ?
       AND ve.embedding MATCH ?
     ORDER BY ve.distance
     LIMIT 20`,
    [versionId, JSON.stringify(queryEmbedding)]
  );

  const vectorResults: SearchResult[] = vectorRows.map((r: any) => ({
    verse: {
      id: r.id,
      versionId: r.version_id,
      bookNumber: r.book_number,
      chapter: r.chapter,
      verseNumber: r.verse_number,
      text: r.text,
    },
    bookName: BOOK_NAMES[r.book_number] || `Book ${r.book_number}`,
    score: 1 - r.distance, // Convert distance to similarity
    snippet: r.text.substring(0, 100),
    source: 'vector' as const,
  }));

  // Step 3: RRF merge
  const merged = rrfMerge(ftsResults, vectorResults, topK);
  return merged;
}
```

### 6.3 `src/utils/rrfMerge.ts`

```typescript
import type { SearchResult } from '@/types/bible';

/**
 * Reciprocal Rank Fusion (RRF) — merges two ranked result lists.
 *
 * Algorithm:
 *   score(doc) = Σ 1/(k + rank_i(doc))
 *   where k=60 (constant to prevent high-ranked docs from dominating)
 *
 * This is a zero-shot algorithm — no training needed.
 * Uses only rank position, ignores raw scores.
 * Works perfectly offline.
 *
 * Reference: Cormack et al., 2009 — "Reciprocal Rank Fusion outperforms
 * Condorcet and individual Rank Learning Methods"
 */
export function rrfMerge(
  ftsResults: SearchResult[],
  vectorResults: SearchResult[],
  topK: number = 10,
  k: number = 60
): SearchResult[] {
  // Map from verse unique key → { result, score }
  const scoreMap = new Map<string, { result: SearchResult; score: number }>();

  // Helper to create a unique key for deduplication
  const verseKey = (r: SearchResult) =>
    `${r.verse.versionId}:${r.verse.bookNumber}:${r.verse.chapter}:${r.verse.verseNumber}`;

  // Score FTS results by rank position
  ftsResults.forEach((result, rank) => {
    const key = verseKey(result);
    const rrfScore = 1 / (k + rank + 1); // rank is 0-indexed, add 1
    const existing = scoreMap.get(key);
    if (existing) {
      existing.score += rrfScore;
    } else {
      scoreMap.set(key, { result: { ...result, source: 'hybrid' }, score: rrfScore });
    }
  });

  // Score vector results by rank position
  vectorResults.forEach((result, rank) => {
    const key = verseKey(result);
    const rrfScore = 1 / (k + rank + 1);
    const existing = scoreMap.get(key);
    if (existing) {
      existing.score += rrfScore;
    } else {
      scoreMap.set(key, { result: { ...result, source: 'hybrid' }, score: rrfScore });
    }
  });

  // Sort by combined RRF score (descending) and take top K
  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(entry => ({ ...entry.result, score: entry.score }));
}
```

### 6.4 `src/services/concordanceService.ts`

```typescript
import { getDatabase } from './database';
import { BOOK_NAMES } from '@/utils/constants';
import type { OriginalWord, StrongsEntry, CrossReferenceWithText } from '@/types/concordance';

// ─── INTERLINEAR (Word-by-Word) ──────────────────

/**
 * Get all original language words for a specific verse.
 * Returns words in order (word_position) for interlinear display.
 */
export async function getOriginalWords(
  bookNumber: number,
  chapter: number,
  verseNumber: number
): Promise<OriginalWord[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM original_words
     WHERE book_number = ? AND chapter = ? AND verse_number = ?
     ORDER BY word_position`,
    [bookNumber, chapter, verseNumber]
  );
  return rows.map(r => ({
    id: r.id,
    bookNumber: r.book_number,
    chapter: r.chapter,
    verseNumber: r.verse_number,
    wordPosition: r.word_position,
    originalText: r.original_text,
    transliteration: r.transliteration,
    strongsNumber: r.strongs_number,
    language: r.language,
    morphology: r.morphology ? JSON.parse(r.morphology) : null,
    gloss: r.gloss,
  }));
}

// ─── STRONG'S DICTIONARY ─────────────────────────

/** Look up a single Strong's entry by number (e.g., "G26") */
export async function getStrongsEntry(strongsNumber: string): Promise<StrongsEntry | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM strongs_dictionary WHERE strongs_number = ?',
    [strongsNumber]
  );
  if (!row) return null;
  return {
    strongsNumber: row.strongs_number,
    language: row.language,
    originalWord: row.original_word,
    transliteration: row.transliteration,
    pronunciation: row.pronunciation || '',
    definition: row.definition,
    shortDefinition: row.short_definition || '',
    usageCount: row.usage_count,
    kjvTranslations: row.kjv_translations ? JSON.parse(row.kjv_translations) : [],
  };
}

/** Search Strong's definitions (e.g., search "love" finds G26 agape) */
export async function searchStrongs(query: string): Promise<StrongsEntry[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT sd.* FROM strongs_fts
     JOIN strongs_dictionary sd ON sd.rowid = strongs_fts.rowid
     WHERE strongs_fts MATCH ?
     ORDER BY rank
     LIMIT 20`,
    [query]
  );
  return rows.map(r => ({
    strongsNumber: r.strongs_number,
    language: r.language,
    originalWord: r.original_word,
    transliteration: r.transliteration,
    pronunciation: r.pronunciation || '',
    definition: r.definition,
    shortDefinition: r.short_definition || '',
    usageCount: r.usage_count,
    kjvTranslations: r.kjv_translations ? JSON.parse(r.kjv_translations) : [],
  }));
}

/**
 * Find all verses that contain a specific Strong's number.
 * E.g., getVersesByStrongs("G26") → all verses with ἀγάπη (agape/love)
 */
export async function getVersesByStrongs(
  strongsNumber: string,
  versionId: string = 'kjv'
): Promise<{ bookNumber: number; chapter: number; verseNumber: number; text: string; bookName: string }[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT DISTINCT ow.book_number, ow.chapter, ow.verse_number, v.text
     FROM original_words ow
     JOIN verses v ON v.book_number = ow.book_number
       AND v.chapter = ow.chapter
       AND v.verse_number = ow.verse_number
       AND v.version_id = ?
     WHERE ow.strongs_number = ?
     ORDER BY ow.book_number, ow.chapter, ow.verse_number`,
    [versionId, strongsNumber]
  );
  return rows.map(r => ({
    bookNumber: r.book_number,
    chapter: r.chapter,
    verseNumber: r.verse_number,
    text: r.text,
    bookName: BOOK_NAMES[r.book_number] || '',
  }));
}

// ─── CROSS-REFERENCES ────────────────────────────

/**
 * Get cross-references for a verse, with target verse text resolved.
 * Groups by relationship type. Returns max 20 cross-refs.
 */
export async function getCrossReferences(
  bookNumber: number,
  chapter: number,
  verseNumber: number,
  versionId: string = 'kjv'
): Promise<CrossReferenceWithText[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT cr.*, v.text as target_text
     FROM cross_references cr
     LEFT JOIN verses v ON v.book_number = cr.target_book
       AND v.chapter = cr.target_chapter
       AND v.verse_number = cr.target_verse_start
       AND v.version_id = ?
     WHERE cr.source_book = ? AND cr.source_chapter = ? AND cr.source_verse_start = ?
     ORDER BY cr.confidence DESC, cr.votes DESC
     LIMIT 20`,
    [versionId, bookNumber, chapter, verseNumber]
  );

  return rows.map(r => {
    const targetBookName = BOOK_NAMES[r.target_book] || '';
    const targetLabel = r.target_verse_end
      ? `${targetBookName} ${r.target_chapter}:${r.target_verse_start}-${r.target_verse_end}`
      : `${targetBookName} ${r.target_chapter}:${r.target_verse_start}`;

    return {
      id: r.id,
      sourceBook: r.source_book,
      sourceChapter: r.source_chapter,
      sourceVerseStart: r.source_verse_start,
      sourceVerseEnd: r.source_verse_end,
      targetBook: r.target_book,
      targetChapter: r.target_chapter,
      targetVerseStart: r.target_verse_start,
      targetVerseEnd: r.target_verse_end,
      relationshipType: r.relationship_type,
      confidence: r.confidence,
      votes: r.votes,
      targetText: r.target_text || '',
      targetBookName,
      targetLabel,
    };
  });
}
```

### 6.5 `src/services/bookmarkService.ts`

```typescript
import { getDatabase } from './database';
import { v4 as uuidv4 } from 'uuid';
import { BOOK_NAMES } from '@/utils/constants';
import type { Bookmark } from '@/types/user';

/** Add a bookmark (highlight) on a verse */
export async function addBookmark(
  versionId: string,
  bookNumber: number,
  chapter: number,
  verseNumber: number,
  color: string = '#FFD700'
): Promise<Bookmark> {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT OR REPLACE INTO bookmarks (id, version_id, book_number, chapter, verse_number, highlight_color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, versionId, bookNumber, chapter, verseNumber, color, now, now]
  );

  // Add to sync queue
  await db.runAsync(
    `INSERT INTO sync_queue (table_name, record_id, action, payload)
     VALUES ('bookmarks', ?, 'INSERT', ?)`,
    [id, JSON.stringify({ id, versionId, bookNumber, chapter, verseNumber, color })]
  );

  return { id, versionId, bookNumber, chapter, verseNumber, highlightColor: color, createdAt: now, updatedAt: now, isSynced: false };
}

/** Remove a bookmark */
export async function removeBookmark(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM bookmarks WHERE id = ?', [id]);
  await db.runAsync(
    `INSERT INTO sync_queue (table_name, record_id, action, payload) VALUES ('bookmarks', ?, 'DELETE', '{}')`,
    [id]
  );
}

/** Get all bookmarks, newest first */
export async function getAllBookmarks(): Promise<(Bookmark & { bookName: string })[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM bookmarks ORDER BY created_at DESC'
  );
  return rows.map(r => ({
    id: r.id,
    versionId: r.version_id,
    bookNumber: r.book_number,
    chapter: r.chapter,
    verseNumber: r.verse_number,
    highlightColor: r.highlight_color,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isSynced: r.is_synced === 1,
    bookName: BOOK_NAMES[r.book_number] || '',
  }));
}

/** Check if a specific verse is bookmarked */
export async function isVerseBookmarked(
  versionId: string,
  bookNumber: number,
  chapter: number,
  verseNumber: number
): Promise<Bookmark | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM bookmarks
     WHERE version_id = ? AND book_number = ? AND chapter = ? AND verse_number = ?`,
    [versionId, bookNumber, chapter, verseNumber]
  );
  if (!row) return null;
  return {
    id: row.id,
    versionId: row.version_id,
    bookNumber: row.book_number,
    chapter: row.chapter,
    verseNumber: row.verse_number,
    highlightColor: row.highlight_color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isSynced: row.is_synced === 1,
  };
}
```

---

## 7. Concordance & Original Languages

> See `concordanceService.ts` above (Section 6.4) for all queries.
> This section covers the **build-time data ingestion** scripts.

### 7.1 Data Sources & Download URLs

| Dataset | URL | Format |
|---------|-----|--------|
| **OpenGNT** (Greek NT) | `https://raw.githubusercontent.com/eliranwong/OpenGNT/master/OpenGNT_BASE_TEXT.tsv` | TSV |
| **OSHB** (Hebrew OT) | `https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/` (per-book XML) | OSIS XML |
| **Strong's Greek** | `https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.json` | JSON |
| **Strong's Hebrew** | `https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.json` | JSON |
| **Cross-References** | `https://a]www.openbible.info/labs/cross-references/cross_references.txt` | TSV |

### 7.2 Build Script: `scripts/import-concordance.ts`

See Section 13.2 for the full script.

---

## 8. AI Engine (On-Device)

### 8.1 `src/ai/modelManager.ts`

```typescript
import * as FileSystem from 'expo-file-system';
import { getDatabase } from '@/services/database';
import * as Device from 'expo-device';
import type { AIModel, DeviceCapability, ModelDownloadProgress } from '@/types/ai';

const MODELS_DIR = `${FileSystem.documentDirectory}models/`;

/** Ensure models directory exists */
async function ensureModelsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(MODELS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
  }
}

/** Get all registered AI models with their download status */
export async function getAvailableModels(): Promise<AIModel[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM ai_models ORDER BY file_size_mb');
  return rows.map(r => ({
    id: r.id,
    modelType: r.model_type,
    displayName: r.display_name,
    description: r.description || '',
    fileSizeMb: r.file_size_mb,
    ramRequiredMb: r.ram_required_mb,
    downloadUrl: r.download_url,
    filePath: r.file_path,
    isDownloaded: r.is_downloaded === 1,
    downloadDate: r.download_date,
    version: r.version,
  }));
}

/**
 * Download an AI model from HuggingFace.
 * Saves to FileSystem.documentDirectory/models/
 * Calls onProgress with download percentage.
 */
export async function downloadModel(
  modelId: string,
  onProgress?: (progress: ModelDownloadProgress) => void
): Promise<string> {
  await ensureModelsDir();
  const db = getDatabase();

  // Get model info
  const model = await db.getFirstAsync<any>(
    'SELECT * FROM ai_models WHERE id = ?', [modelId]
  );
  if (!model) throw new Error(`Model not found: ${modelId}`);

  const filePath = `${MODELS_DIR}${modelId}.gguf`;

  // Start download with progress tracking
  const downloadResumable = FileSystem.createDownloadResumable(
    model.download_url,
    filePath,
    {},
    (downloadProgress) => {
      const percentage = Math.round(
        (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
      );
      onProgress?.({
        modelId,
        bytesDownloaded: downloadProgress.totalBytesWritten,
        totalBytes: downloadProgress.totalBytesExpectedToWrite,
        percentage,
        status: 'downloading',
        error: null,
      });
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result?.uri) throw new Error('Download failed');

  // Update database
  await db.runAsync(
    `UPDATE ai_models SET is_downloaded = 1, file_path = ?, download_date = datetime('now')
     WHERE id = ?`,
    [filePath, modelId]
  );

  onProgress?.({
    modelId,
    bytesDownloaded: 0,
    totalBytes: 0,
    percentage: 100,
    status: 'ready',
    error: null,
  });

  return filePath;
}

/** Delete a downloaded model to free space */
export async function deleteModel(modelId: string): Promise<void> {
  const db = getDatabase();
  const model = await db.getFirstAsync<any>(
    'SELECT file_path FROM ai_models WHERE id = ?', [modelId]
  );
  if (model?.file_path) {
    await FileSystem.deleteAsync(model.file_path, { idempotent: true });
  }
  await db.runAsync(
    'UPDATE ai_models SET is_downloaded = 0, file_path = NULL, download_date = NULL WHERE id = ?',
    [modelId]
  );
}

/** Detect device capability and recommend model tier */
export async function getDeviceCapability(): Promise<DeviceCapability> {
  const totalRamMb = (Device.totalMemory || 0) / (1024 * 1024);

  let recommendedTier: 'full' | 'lite' | 'none';
  if (totalRamMb >= 3000) {
    recommendedTier = 'full';  // BibleSLM-1.5B
  } else if (totalRamMb >= 2000) {
    recommendedTier = 'lite';  // BibleSLM-0.5B
  } else {
    recommendedTier = 'none';  // FTS-only search
  }

  return {
    totalRamMb: Math.round(totalRamMb),
    availableRamMb: Math.round(totalRamMb * 0.5), // Rough estimate
    recommendedTier,
    canRunLlm: totalRamMb >= 2000,
    canRunWhisper: totalRamMb >= 1500,
  };
}
```

### 8.2 `src/ai/llamaEngine.ts`

```typescript
import { initLlama, type LlamaContext } from 'llama.rn';

let context: LlamaContext | null = null;

/**
 * Initialize the LLM engine with a GGUF model file.
 * Call once when user first opens AI chat (after model download).
 */
export async function loadModel(modelPath: string): Promise<void> {
  if (context) {
    await context.release();
  }

  context = await initLlama({
    model: modelPath,
    n_ctx: 4096,        // Context window (tokens)
    n_batch: 512,       // Batch size for prompt processing
    n_threads: 4,       // CPU threads for inference
    n_gpu_layers: 0,    // 0 = CPU only (GPU layers for supported devices)
    use_mlock: false,
    use_mmap: true,     // Memory-map the model file
  });

  console.log('[LLM] Model loaded successfully');
}

/**
 * Generate a response from the loaded LLM.
 * Streams tokens via callback for real-time display.
 *
 * @param prompt - Full prompt including system message + context + user query
 * @param onToken - Called for each generated token
 * @returns Full generated text
 */
export async function generateResponse(
  prompt: string,
  onToken?: (token: string) => void,
  maxTokens: number = 512
): Promise<string> {
  if (!context) throw new Error('LLM not loaded. Call loadModel() first.');

  const result = await context.completion(
    {
      prompt,
      n_predict: maxTokens,
      temperature: 0.3,     // Low temperature for factual Bible answers
      top_k: 40,
      top_p: 0.9,
      repeat_penalty: 1.1,
      stop: ['</s>', '<|endoftext|>', 'User:', '\nQuestion:'],
    },
    (data) => {
      // Called for each token during streaming
      if (data.token) {
        onToken?.(data.token);
      }
    }
  );

  return result.text;
}

/** Check if a model is currently loaded */
export function isModelLoaded(): boolean {
  return context !== null;
}

/** Release the model from memory */
export async function releaseModel(): Promise<void> {
  if (context) {
    await context.release();
    context = null;
  }
}
```

### 8.3 `src/ai/ragPipeline.ts`

```typescript
import { generateResponse, isModelLoaded, loadModel } from './llamaEngine';
import { hybridSearch } from '@/services/searchService';
import { buildRAGPrompt, BIBLE_SYSTEM_PROMPT } from './prompts';
import { getDatabase } from '@/services/database';
import type { RAGStreamChunk, SearchResult } from '@/types/ai';
import type { VerseRef } from '@/types/bible';
import { BOOK_NAMES } from '@/utils/constants';

/**
 * THE MAIN RAG PIPELINE — Ask a Bible question, get a streamed answer.
 *
 * Full flow (all on-device, zero network):
 * 1. Embed user query (placeholder: use FTS for now until embedding model integrated)
 * 2. Hybrid search: FTS5 + sqlite-vec → RRF merge → top-10 verses
 * 3. Build prompt: system prompt + retrieved verses + user query
 * 4. Stream tokens from BibleSLM (on-device LLM)
 * 5. Parse verse citations from response
 *
 * @param query - User's question (e.g., "What does Jesus say about forgiveness?")
 * @param versionId - Bible version to search (e.g., "kjv")
 * @param onChunk - Callback for each streamed chunk (token, citation, done, error)
 */
export async function askBible(
  query: string,
  versionId: string,
  onChunk: (chunk: RAGStreamChunk) => void
): Promise<void> {
  try {
    // Step 1: Check if LLM is loaded
    if (!isModelLoaded()) {
      const db = getDatabase();
      const model = await db.getFirstAsync<any>(
        "SELECT file_path FROM ai_models WHERE model_type = 'llm' AND is_downloaded = 1 LIMIT 1"
      );
      if (!model?.file_path) {
        onChunk({ type: 'error', error: 'No AI model downloaded. Please download a model first.' });
        return;
      }
      await loadModel(model.file_path);
    }

    // Step 2: Hybrid search for relevant verses
    // Note: For now, use empty embedding array. When MiniLM is integrated,
    // pass real query embeddings here.
    const queryEmbedding: number[] = []; // TODO: embed with on-device MiniLM
    let searchResults: SearchResult[];

    if (queryEmbedding.length > 0) {
      searchResults = await hybridSearch(query, queryEmbedding, versionId, 10);
    } else {
      // Fallback: FTS-only search until embedding model is available
      const { searchFTS } = await import('@/services/searchService');
      searchResults = await searchFTS(query, versionId, 10);
    }

    if (searchResults.length === 0) {
      onChunk({ type: 'error', error: 'No relevant verses found. Try rephrasing your question.' });
      return;
    }

    // Step 3: Build prompt
    const versesContext = searchResults.map((r, i) => {
      const bookName = BOOK_NAMES[r.verse.bookNumber] || '';
      return `[${i + 1}] ${bookName} ${r.verse.chapter}:${r.verse.verseNumber} — "${r.verse.text}"`;
    }).join('\n');

    const prompt = buildRAGPrompt(BIBLE_SYSTEM_PROMPT, versesContext, query);

    // Step 4: Stream response from BibleSLM
    let fullText = '';
    await generateResponse(
      prompt,
      (token) => {
        fullText += token;
        onChunk({ type: 'token', token, fullText });
      },
      512
    );

    // Step 5: Parse verse citations from response
    const citations = parseVerseCitations(fullText);
    for (const citation of citations) {
      onChunk({ type: 'citation', citation });
    }

    onChunk({ type: 'done', fullText });

  } catch (error) {
    onChunk({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error during AI generation',
    });
  }
}

/**
 * Parse verse citations from AI response text.
 * Finds patterns like "John 3:16", "Genesis 1:1-3", "Romans 8:28"
 */
function parseVerseCitations(text: string): VerseRef[] {
  const BOOK_PATTERNS = Object.entries(BOOK_NAMES).map(([num, name]) => ({
    bookNumber: parseInt(num),
    pattern: new RegExp(`${name}\\s+(\\d+):(\\d+)(?:-(\\d+))?`, 'gi'),
  }));

  const citations: VerseRef[] = [];
  const seen = new Set<string>();

  for (const { bookNumber, pattern } of BOOK_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const chapter = parseInt(match[1]);
      const verse = parseInt(match[2]);
      const key = `${bookNumber}:${chapter}:${verse}`;
      if (!seen.has(key)) {
        seen.add(key);
        citations.push({ bookNumber, chapter, verseNumber: verse });
      }
    }
  }

  return citations;
}
```

### 8.4 `src/ai/prompts.ts`

```typescript
/**
 * System prompt for BibleSLM — the fine-tuned Bible study assistant.
 * This prompt tells the model HOW to behave.
 */
export const BIBLE_SYSTEM_PROMPT = `You are a Bible Study Assistant. Your purpose is to help users understand scripture.

RULES:
1. Answer ONLY from the provided scripture passages below. Do not use outside knowledge.
2. Always cite specific verses in the format "Book Chapter:Verse" (e.g., John 3:16).
3. If the provided passages do not contain enough information to answer, say: "I cannot find a clear answer to that in the provided passages."
4. Stay neutral — do not favor any denomination. Let scripture speak for itself.
5. Be concise but thorough. Explain the meaning in simple, clear language.
6. If asked about non-biblical topics (weather, politics, science, coding), politely redirect: "I'm a Bible study assistant. I can help you explore scripture — would you like to ask about a biblical topic?"
7. When multiple passages are relevant, synthesize them together.
8. Use respectful, warm language appropriate for spiritual study.`;

/**
 * Build the full RAG prompt that gets sent to BibleSLM.
 *
 * Format:
 * <system prompt>
 * <retrieved verse context>
 * <user question>
 */
export function buildRAGPrompt(
  systemPrompt: string,
  versesContext: string,
  userQuery: string
): string {
  return `${systemPrompt}

SCRIPTURE PASSAGES:
${versesContext}

QUESTION: ${userQuery}

ANSWER:`;
}
```

---

## 9. Zustand Stores

### 9.1 `src/stores/readerStore.ts`

```typescript
import { create } from 'zustand';

interface ReaderState {
  // Current reading position
  currentVersionId: string;
  currentBookNumber: number;
  currentChapter: number;
  selectedVerseNumber: number | null;

  // Display settings
  fontSize: number;
  showInterlinear: boolean;
  showCrossRefs: boolean;
  showParallelView: boolean;
  parallelVersionId: string | null;

  // Actions
  setVersion: (versionId: string) => void;
  navigateTo: (bookNumber: number, chapter: number) => void;
  nextChapter: () => void;
  prevChapter: () => void;
  selectVerse: (verseNumber: number | null) => void;
  setFontSize: (size: number) => void;
  toggleInterlinear: () => void;
  toggleCrossRefs: () => void;
  toggleParallelView: (versionId?: string) => void;
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  currentVersionId: 'kjv',
  currentBookNumber: 1,    // Genesis
  currentChapter: 1,
  selectedVerseNumber: null,

  fontSize: 18,
  showInterlinear: false,
  showCrossRefs: false,
  showParallelView: false,
  parallelVersionId: null,

  setVersion: (versionId) => set({ currentVersionId: versionId }),

  navigateTo: (bookNumber, chapter) => set({
    currentBookNumber: bookNumber,
    currentChapter: chapter,
    selectedVerseNumber: null,
  }),

  nextChapter: () => {
    const { currentChapter } = get();
    set({ currentChapter: currentChapter + 1, selectedVerseNumber: null });
    // TODO: handle book boundary (last chapter → next book)
  },

  prevChapter: () => {
    const { currentChapter } = get();
    if (currentChapter > 1) {
      set({ currentChapter: currentChapter - 1, selectedVerseNumber: null });
    }
    // TODO: handle book boundary (chapter 1 → previous book last chapter)
  },

  selectVerse: (verseNumber) => set({ selectedVerseNumber: verseNumber }),
  setFontSize: (size) => set({ fontSize: Math.max(14, Math.min(28, size)) }),
  toggleInterlinear: () => set(s => ({ showInterlinear: !s.showInterlinear })),
  toggleCrossRefs: () => set(s => ({ showCrossRefs: !s.showCrossRefs })),
  toggleParallelView: (versionId) => set(s => ({
    showParallelView: !s.showParallelView,
    parallelVersionId: versionId || s.parallelVersionId,
  })),
}));
```

### 9.2 `src/stores/chatStore.ts`

```typescript
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage } from '@/types/ai';

interface ChatState {
  messages: ChatMessage[];
  currentSessionId: string;
  isGenerating: boolean;
  streamingText: string;

  sendMessage: (content: string, versionId: string) => void;
  appendStreamToken: (token: string) => void;
  finishGeneration: (fullText: string, citedVerses: any[]) => void;
  cancelGeneration: () => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentSessionId: uuidv4(),
  isGenerating: false,
  streamingText: '',

  sendMessage: (content, versionId) => {
    const userMessage: ChatMessage = {
      id: uuidv4(),
      sessionId: get().currentSessionId,
      role: 'user',
      content,
      citedVerses: [],
      versionId,
      createdAt: new Date().toISOString(),
    };
    set(s => ({
      messages: [...s.messages, userMessage],
      isGenerating: true,
      streamingText: '',
    }));
  },

  appendStreamToken: (token) => {
    set(s => ({ streamingText: s.streamingText + token }));
  },

  finishGeneration: (fullText, citedVerses) => {
    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      sessionId: get().currentSessionId,
      role: 'assistant',
      content: fullText,
      citedVerses,
      versionId: '',
      createdAt: new Date().toISOString(),
    };
    set(s => ({
      messages: [...s.messages, assistantMessage],
      isGenerating: false,
      streamingText: '',
    }));
  },

  cancelGeneration: () => set({ isGenerating: false, streamingText: '' }),
  clearChat: () => set({ messages: [], currentSessionId: uuidv4(), streamingText: '' }),
}));
```

---

## 10. Screens & Navigation

### 10.1 `app/_layout.tsx` — Root Layout

```typescript
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '@/services/database';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit: require('../assets/fonts/Outfit-Regular.ttf'),
    'Outfit-Medium': require('../assets/fonts/Outfit-Medium.ttf'),
    'Outfit-SemiBold': require('../assets/fonts/Outfit-SemiBold.ttf'),
    'Outfit-Bold': require('../assets/fonts/Outfit-Bold.ttf'),
    SourceSerif4: require('../assets/fonts/SourceSerif4-Regular.ttf'),
    'SourceSerif4-SemiBold': require('../assets/fonts/SourceSerif4-SemiBold.ttf'),
  });

  useEffect(() => {
    async function init() {
      await initDatabase();
      if (fontsLoaded) {
        await SplashScreen.hideAsync();
      }
    }
    init();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recordings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="bookmarks" options={{ presentation: 'modal' }} />
        <Stack.Screen name="concordance/[strongsNumber]" options={{ presentation: 'card' }} />
      </Stack>
    </>
  );
}
```

### 10.2 `app/(tabs)/_layout.tsx` — Tab Navigator

```typescript
import { Tabs } from 'expo-router';
import { useTheme } from '@/theme';
// Use react-native-svg or expo-vector-icons for tab icons

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Outfit' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: /* HomeIcon */ ({}) => null }} />
      <Tabs.Screen name="read" options={{ title: 'Read', tabBarIcon: /* BookIcon */ ({}) => null }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: /* SearchIcon */ ({}) => null }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: /* CalendarIcon */ ({}) => null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: /* UserIcon */ ({}) => null }} />
    </Tabs>
  );
}
```

> **Note to Gemini**: Implement all remaining screens following the patterns above. Key screens:
> - `app/(tabs)/index.tsx` — Home: VOTD card, continue reading card, quick action grid
> - `app/(tabs)/read/[book]/[chapter].tsx` — Verse reader: the most complex screen. Use FlatList for verses, long-press for bookmark, show interlinear/cross-refs on toggle
> - `app/(tabs)/search.tsx` — Two tabs: "Text" (FTS5) and "AI" (opens chat)
> - `app/chat.tsx` — AI chat with streaming. Use `askBible()` from ragPipeline.ts
> - `app/concordance/[strongsNumber].tsx` — Strong's detail: word, definition, "Find all N verses" button

---

## 11. Reusable Components

> **Key components to implement** (see folder structure in Section 1.3 for full list):

### 11.1 `src/components/scripture/InterlinearView.tsx`

This component displays word-by-word original language data for a verse:

```
┌──────────────────────────────────────────┐
│  Ἐν     ἀρχῇ      ἦν      ὁ     λόγος  │  ← Greek text
│  En     archē     ēn      ho    logos   │  ← Transliteration
│  G1722  G746      G2258   G3588 G3056   │  ← Strong's numbers (tappable)
│  In     beginning was     the   Word    │  ← English gloss
└──────────────────────────────────────────┘
```

Each word is tappable → opens `StrongsPopover` with full definition.

### 11.2 `src/components/scripture/CrossRefPanel.tsx`

Groups cross-references by type with icons:

```
📜 Quotations (2)
  → Isaiah 7:14 — "Therefore the Lord himself shall give..."
  → Micah 5:2 — "But thou, Bethlehem Ephratah..."

‖ Parallels (3)
  ↔ Mark 1:1-11 — "The beginning of the gospel..."
  ↔ Luke 3:21-22 — "Now when all the people were..."

🔗 Thematic (5)
  ~ Romans 1:3-4 — "Concerning his Son Jesus Christ..."
```

---

## 12. Custom Hooks

> Implement these hooks using the services defined in Section 6:

| Hook | File | Uses Service | Key Functions |
|------|------|-------------|---------------|
| `useBibleReader` | `src/hooks/useBibleReader.ts` | `bibleService` | `loadChapter()`, `goNext()`, `goPrev()` |
| `useBookmarks` | `src/hooks/useBookmarks.ts` | `bookmarkService` | `toggle()`, `isBookmarked()`, `getAll()` |
| `useNotes` | `src/hooks/useNotes.ts` | `noteService` | `save()`, `delete()`, `search()` |
| `useChat` | `src/hooks/useChat.ts` | `ragPipeline` + `chatStore` | `send()`, `cancel()`, `clear()` |
| `useConcordance` | `src/hooks/useConcordance.ts` | `concordanceService` | `getWords()`, `lookupStrongs()` |
| `useCrossReferences` | `src/hooks/useCrossReferences.ts` | `concordanceService` | `getRefs()`, `navigate()` |
| `useRecorder` | `src/hooks/useRecorder.ts` | `expo-av` + `whisperEngine` | `start()`, `stop()`, `transcribe()` |
| `useSearch` | `src/hooks/useSearch.ts` | `searchService` | `search()`, `clearResults()` |
| `useDownload` | `src/hooks/useDownload.ts` | `modelManager` | `download()`, `cancel()`, `progress` |

---

## 13. Build-Time Scripts

### 13.1 `scripts/import-bible.ts`

```typescript
/**
 * BUILD-TIME SCRIPT — Run on developer machine, NOT on device.
 * Fetches Bible translations from Bolls.life API and outputs SQLite.
 *
 * Usage: npx ts-node scripts/import-bible.ts
 *
 * API Endpoints:
 *   GET https://bolls.life/get-books/{translation}/
 *     → [{ "bookNumber": 1, "name": "Genesis", "chapters": 50 }, ...]
 *
 *   GET https://bolls.life/get-text/{translation}/{book}/{chapter}/
 *     → [{ "verse": 1, "text": "In the beginning God created..." }, ...]
 *
 * Translations to fetch: KJV, WEB, ASV (public domain)
 */

import Database from 'better-sqlite3'; // Use better-sqlite3 for Node.js

const TRANSLATIONS = [
  { id: 'kjv', name: 'King James Version', apiCode: 'KJV' },
  { id: 'web', name: 'World English Bible', apiCode: 'WEB' },
  { id: 'asv', name: 'American Standard Version', apiCode: 'ASV' },
];

const API_BASE = 'https://bolls.life';
const DB_PATH = './output/bible.db';

async function fetchJSON(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function importTranslation(db: Database.Database, translation: typeof TRANSLATIONS[0]) {
  console.log(`\n📖 Importing ${translation.name}...`);

  // Insert version
  db.prepare('INSERT OR IGNORE INTO bible_versions (id, name, language, is_downloaded) VALUES (?, ?, ?, 1)')
    .run(translation.id, translation.name, 'en');

  // Fetch books
  const books = await fetchJSON(`${API_BASE}/get-books/${translation.apiCode}/`);

  const insertBook = db.prepare(
    'INSERT OR IGNORE INTO books (version_id, book_number, name, abbreviation, testament, total_chapters) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertVerse = db.prepare(
    'INSERT OR IGNORE INTO verses (version_id, book_number, chapter, verse_number, text) VALUES (?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction((bookList: any[]) => {
    for (const book of bookList) {
      const testament = book.bookNumber <= 39 ? 'OT' : 'NT';
      const abbrev = book.name.substring(0, 3); // Simplified abbreviation
      insertBook.run(translation.id, book.bookNumber, book.name, abbrev, testament, book.chapters);

      // Fetch each chapter
      for (let ch = 1; ch <= book.chapters; ch++) {
        // Note: add delay between requests to avoid rate limiting
        const verses = await fetchJSON(`${API_BASE}/get-text/${translation.apiCode}/${book.bookNumber}/${ch}/`);
        for (const v of verses) {
          insertVerse.run(translation.id, book.bookNumber, ch, v.verse, v.text);
        }
        process.stdout.write(`.`);
      }
    }
  });

  // Note: The transaction above won't work with async fetch inside.
  // In practice, fetch all data first, then batch insert.
  // This is pseudocode — actual implementation needs sequential fetching then batch insert.

  console.log(`\n✅ ${translation.name} imported`);
}

async function main() {
  const db = new Database(DB_PATH);
  // Create tables (same SQL from schema.ts)
  // ... run CREATE TABLE statements ...

  for (const t of TRANSLATIONS) {
    await importTranslation(db, t);
  }

  console.log('\n🎉 All translations imported to', DB_PATH);
  db.close();
}

main().catch(console.error);
```

### 13.2 `scripts/import-concordance.ts`

```typescript
/**
 * BUILD-TIME SCRIPT — Import original language data.
 *
 * Data sources:
 * 1. OpenGNT (Greek NT): TSV with columns:
 *    [BookChapterVerse] [OriginalGreek] [Transliteration] [StrongsNumber] [Morphology] [Gloss]
 *    Download: https://raw.githubusercontent.com/eliranwong/OpenGNT/master/OpenGNT_BASE_TEXT.tsv
 *
 * 2. Strong's Greek Dictionary:
 *    https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.json
 *    Format: { "G1": { "lemma": "Α", "translit": "A", "derivation": "...", "strongs_def": "..." }, ... }
 *
 * 3. Strong's Hebrew Dictionary:
 *    https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.json
 *    Same format with "H1", "H2", etc.
 *
 * 4. Cross-references from OpenBible.info:
 *    https://www.openbible.info/labs/cross-references/cross_references.txt
 *    Format (TSV): FromVerse\tToVerse\tVotes
 *    Example: Gen.1.1\tJohn.1.1\t125
 *
 * Usage: npx ts-node scripts/import-concordance.ts
 */

// Pseudocode for the import pipeline:

async function importStrongsDictionary(db: Database.Database) {
  // 1. Fetch Greek dictionary JSON
  const greekDict = await fetchJSON('https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.json');

  // 2. Fetch Hebrew dictionary JSON
  const hebrewDict = await fetchJSON('https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.json');

  // 3. Insert each entry into strongs_dictionary
  const insert = db.prepare(`
    INSERT OR IGNORE INTO strongs_dictionary
    (strongs_number, language, original_word, transliteration, pronunciation, definition, short_definition, usage_count, kjv_translations)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [key, entry] of Object.entries(greekDict)) {
    // key = "G1", entry = { lemma, translit, strongs_def, kjv_def, ... }
    insert.run(key, 'greek', entry.lemma, entry.translit, entry.pronun || '', entry.strongs_def, entry.kjv_def, 0, '[]');
  }

  for (const [key, entry] of Object.entries(hebrewDict)) {
    insert.run(key, 'hebrew', entry.lemma, entry.translit, entry.pronun || '', entry.strongs_def, entry.kjv_def, 0, '[]');
  }

  console.log('✅ Strong\'s dictionary imported');
}

async function importCrossReferences(db: Database.Database) {
  // 1. Fetch cross-references TSV
  const text = await fetchText('https://www.openbible.info/labs/cross-references/cross_references.txt');

  // 2. Parse each line: "Gen.1.1\tJohn.1.1\t125"
  const insert = db.prepare(`
    INSERT INTO cross_references
    (source_book, source_chapter, source_verse_start, target_book, target_chapter, target_verse_start, relationship_type, votes)
    VALUES (?, ?, ?, ?, ?, ?, 'thematic', ?)
  `);

  for (const line of text.split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue;
    const [from, to, votes] = line.split('\t');
    // Parse "Gen.1.1" → { book: 1, chapter: 1, verse: 1 }
    const source = parseVerseRef(from);
    const target = parseVerseRef(to);
    if (source && target) {
      insert.run(source.book, source.chapter, source.verse, target.book, target.chapter, target.verse, parseInt(votes) || 0);
    }
  }

  console.log('✅ Cross-references imported');
}

// Helper: Parse "Gen.1.1" → { book: 1, chapter: 1, verse: 1 }
function parseVerseRef(ref: string): { book: number; chapter: number; verse: number } | null {
  const parts = ref.split('.');
  if (parts.length !== 3) return null;
  const bookNumber = BOOK_ABBREV_TO_NUMBER[parts[0]]; // Map "Gen"→1, "Exo"→2, etc.
  return bookNumber ? { book: bookNumber, chapter: parseInt(parts[1]), verse: parseInt(parts[2]) } : null;
}
```

---

## 14. Bible SLM Fine-Tuning

### 14.1 Training Data Format

Each training example is a JSON object in ChatML format:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a Bible Study Assistant. Answer ONLY from the provided scripture passages. Cite specific book, chapter, and verse."
    },
    {
      "role": "user",
      "content": "SCRIPTURE PASSAGES:\n[1] John 3:16 — \"For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.\"\n[2] Romans 5:8 — \"But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.\"\n[3] 1 John 4:9 — \"In this was manifested the love of God toward us, because that God sent his only begotten Son into the world, that we might live through him.\"\n\nQUESTION: How does God show His love for us?"
    },
    {
      "role": "assistant",
      "content": "God demonstrates His love for us in several profound ways according to these passages:\n\n1. **Sacrificial giving**: John 3:16 tells us God \"so loved the world, that he gave his only begotten Son.\" The ultimate expression of love was giving what was most precious.\n\n2. **Unconditional love**: Romans 5:8 emphasizes that Christ died for us \"while we were yet sinners\" — God's love wasn't contingent on our worthiness.\n\n3. **Life-giving purpose**: 1 John 4:9 reveals the purpose: \"that we might live through him.\" God's love is not abstract — it has the practical goal of giving us life.\n\nThe common thread across all three passages is that God took the initiative to love us through the gift of His Son, not because we deserved it, but because of the nature of His love."
    }
  ]
}
```

### 14.2 Refusal Example (15% of training data)

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a Bible Study Assistant. Answer ONLY from the provided scripture passages."
    },
    {
      "role": "user",
      "content": "SCRIPTURE PASSAGES:\n[1] Psalm 23:1 — \"The LORD is my shepherd; I shall not want.\"\n\nQUESTION: What is the weather forecast for tomorrow?"
    },
    {
      "role": "assistant",
      "content": "I'm a Bible study assistant and I can only help with questions about scripture. I can't provide weather forecasts. Would you like to explore what Psalm 23 teaches about God's provision and care instead?"
    }
  ]
}
```

### 14.3 Fine-Tuning Script (Python + Unsloth)

```python
# fine_tune_bible_slm.py
# Requirements: pip install unsloth transformers datasets trl

from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments
from datasets import load_dataset

# 1. Load base model with Unsloth (2x faster, 50% less VRAM)
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Qwen2.5-1.5B-Instruct",
    max_seq_length=4096,
    load_in_4bit=True,  # QLoRA
)

# 2. Add LoRA adapters
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                     "gate_proj", "up_proj", "down_proj"],
    lora_dropout=0.05,
    bias="none",
)

# 3. Load training data
dataset = load_dataset("json", data_files="bible_qa_train.jsonl", split="train")

# 4. Format for ChatML
def format_chat(example):
    return tokenizer.apply_chat_template(example["messages"], tokenize=False)

dataset = dataset.map(lambda x: {"text": format_chat(x)})

# 5. Train
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=4096,
    args=TrainingArguments(
        output_dir="./bibleslm-1.5b-lora",
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        num_train_epochs=3,
        learning_rate=2e-4,
        warmup_steps=50,
        fp16=True,
        logging_steps=10,
        save_strategy="epoch",
    ),
)

trainer.train()

# 6. Save merged model
model.save_pretrained_merged("./bibleslm-1.5b-merged", tokenizer)

# 7. Convert to GGUF (run separately):
# python llama.cpp/convert_hf_to_gguf.py ./bibleslm-1.5b-merged --outtype q4_k_m
```

---

## 15. Deployment & Launch

### 15.1 Model Hosting (HuggingFace)

Create a HuggingFace repository:
```
yourname/BibleSLM-1.5B-GGUF/
├── bibleslm-1.5b-q4_k_m.gguf    # ~986 MB
├── README.md                      # Model card
└── config.json                    # Metadata

yourname/BibleSLM-0.5B-GGUF/
├── bibleslm-0.5b-q4_k_m.gguf    # ~400 MB
└── README.md
```

### 15.2 Bible Data Hosting

Host pre-built SQLite files:
```
yourname/bible-data/
├── kjv.sqlite        # ~5 MB (verses + FTS5)
├── web.sqlite        # ~5 MB
├── asv.sqlite        # ~4 MB
├── concordance.sqlite # ~26 MB (original_words + strongs + cross_refs)
├── kjv-embeddings.sqlite  # ~25 MB (sqlite-vec vectors)
└── web-embeddings.sqlite  # ~25 MB
```

---

## 16. Testing

### 16.1 Key Test Files

| Test File | Tests |
|-----------|-------|
| `__tests__/services/bibleService.test.ts` | getBooks, getChapterVerses, getVerse |
| `__tests__/services/searchService.test.ts` | searchFTS, hybridSearch |
| `__tests__/services/concordanceService.test.ts` | getOriginalWords, getStrongsEntry, getCrossReferences |
| `__tests__/utils/rrfMerge.test.ts` | RRF algorithm correctness |
| `__tests__/ai/ragPipeline.test.ts` | Prompt building, citation parsing |

---

## 17. Appendix

### 17.1 Bible Book Names & Numbers

```typescript
// src/utils/constants.ts
export const BOOK_NAMES: Record<number, string> = {
  1: 'Genesis', 2: 'Exodus', 3: 'Leviticus', 4: 'Numbers', 5: 'Deuteronomy',
  6: 'Joshua', 7: 'Judges', 8: 'Ruth', 9: '1 Samuel', 10: '2 Samuel',
  11: '1 Kings', 12: '2 Kings', 13: '1 Chronicles', 14: '2 Chronicles',
  15: 'Ezra', 16: 'Nehemiah', 17: 'Esther', 18: 'Job', 19: 'Psalms',
  20: 'Proverbs', 21: 'Ecclesiastes', 22: 'Song of Solomon', 23: 'Isaiah',
  24: 'Jeremiah', 25: 'Lamentations', 26: 'Ezekiel', 27: 'Daniel',
  28: 'Hosea', 29: 'Joel', 30: 'Amos', 31: 'Obadiah', 32: 'Jonah',
  33: 'Micah', 34: 'Nahum', 35: 'Habakkuk', 36: 'Zephaniah', 37: 'Haggai',
  38: 'Zechariah', 39: 'Malachi',
  40: 'Matthew', 41: 'Mark', 42: 'Luke', 43: 'John', 44: 'Acts',
  45: 'Romans', 46: '1 Corinthians', 47: '2 Corinthians', 48: 'Galatians',
  49: 'Ephesians', 50: 'Philippians', 51: 'Colossians',
  52: '1 Thessalonians', 53: '2 Thessalonians',
  54: '1 Timothy', 55: '2 Timothy', 56: 'Titus', 57: 'Philemon',
  58: 'Hebrews', 59: 'James', 60: '1 Peter', 61: '2 Peter',
  62: '1 John', 63: '2 John', 64: '3 John', 65: 'Jude', 66: 'Revelation',
};

export const BOOK_ABBREVIATIONS: Record<number, string> = {
  1: 'Gen', 2: 'Exo', 3: 'Lev', 4: 'Num', 5: 'Deu',
  6: 'Jos', 7: 'Jdg', 8: 'Rut', 9: '1Sa', 10: '2Sa',
  11: '1Ki', 12: '2Ki', 13: '1Ch', 14: '2Ch',
  15: 'Ezr', 16: 'Neh', 17: 'Est', 18: 'Job', 19: 'Psa',
  20: 'Pro', 21: 'Ecc', 22: 'Sng', 23: 'Isa',
  24: 'Jer', 25: 'Lam', 26: 'Eze', 27: 'Dan',
  28: 'Hos', 29: 'Joe', 30: 'Amo', 31: 'Oba', 32: 'Jon',
  33: 'Mic', 34: 'Nah', 35: 'Hab', 36: 'Zep', 37: 'Hag',
  38: 'Zec', 39: 'Mal',
  40: 'Mat', 41: 'Mrk', 42: 'Luk', 43: 'Jhn', 44: 'Act',
  45: 'Rom', 46: '1Co', 47: '2Co', 48: 'Gal',
  49: 'Eph', 50: 'Php', 51: 'Col',
  52: '1Th', 53: '2Th',
  54: '1Ti', 55: '2Ti', 56: 'Tit', 57: 'Phm',
  58: 'Heb', 59: 'Jas', 60: '1Pe', 61: '2Pe',
  62: '1Jn', 63: '2Jn', 64: '3Jn', 65: 'Jud', 66: 'Rev',
};

/** Reverse map: "Gen" → 1, "Exo" → 2, etc. */
export const ABBREV_TO_BOOK_NUMBER: Record<string, number> = Object.fromEntries(
  Object.entries(BOOK_ABBREVIATIONS).map(([num, abbr]) => [abbr, parseInt(num)])
);
```

---

> **END OF IMPLEMENTATION PLAN**
>
> This document contains everything needed to build the Bible app:
> - Every npm package with version
> - Every file path with its purpose
> - Complete TypeScript types
> - Full database schema with SQL
> - Service layer with exact queries
> - AI engine with RAG pipeline code
> - State management stores
> - Screen structure & navigation
> - Build-time data ingestion scripts
> - Fine-tuning guide with Python code
> - Deployment configuration
>
> **Hand this file to Gemini and say: "Implement this app following this plan exactly."**
