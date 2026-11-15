<p align="center">
  <img src="assets/icon.png" alt="Miktam Bible" width="120" height="120" style="border-radius: 24px;" />
</p>

<h1 align="center">Miktam Bible</h1>

<p align="center">
  <strong>Your Offline Bible Study Companion</strong><br/>
  <em>2,600+ translations · AI assistant · Strong's concordance · reading plans — offline after a one-time download.</em>
</p>

<p align="center">
  <a href="https://play.google.com/store/apps/details?id=miktam.bible">
    <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" height="55" />
  </a>
</p>

> [!TIP]
> ### 🚀 Early Access on Google Play for AI2TH Group Members
> All members of the **[AI2TH Google Group](https://groups.google.com/g/ai2th)** automatically receive **Early Access** on Google Play!  
> Once you are a member of this group with your Google account, you can install and update Miktam Bible directly from the **[Play Store](https://play.google.com/store/apps/details?id=miktam.bible)**.  
> If your Google Play account differs from your group email, you can also submit the **[Early Access Request Form](https://forms.gle/jdLxXPVhDYm5ubpQ7)** to be added directly.


<p align="center">
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#supported-translations">Translations</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#building-for-production">Building</a> •
  <a href="#license">License</a>
</p>

---

## Features

### 📖 Scripture Reading
Browse the Bible across **2,600+ translations** in about **1,200 languages** (KJV is built in; others download once). Navigate by book, chapter, and verse with a beautiful dark-mode interface. Long-press any verse to highlight, bookmark, copy, or share.

### 🤖 AI Study Assistant (100% Offline)
Ask theological questions, explore historical context, and unpack biblical definitions using a local **GGUF LLM** (SmolLM2) that runs entirely on your device. No internet required — your conversations stay private.

### 🔍 Strong's Concordance
Look up any Greek or Hebrew word by Strong's number. See the original word, transliteration, definition, and every verse where it appears — across your selected translation.

### 🔎 Full-Text Search
Instantly search the entire Bible for any word or phrase. Results are ranked by relevance with highlighted matches and one-tap navigation to the full chapter.

### 🎙️ Voice Memos
Record voice study notes while reading. Recordings are auto-tagged with the current book, chapter, and verse for easy retrieval later.

### 📅 Reading Calendar
Track your daily reading habit with a visual reading calendar. Maintain your reading streak and monitor weekly/monthly progress.

### 🌓 Light & Dark Mode
Seamless support for both light and dark themes, with an elegant dark background (`#0F0F14`) and gold accent (`#C9A55C`) palette designed for comfortable extended reading.

### 🌍 Multilingual Book Names
Book names are shown in 19 major languages, including Arabic, Hindi, Korean and Tamil. Other translations use English book names for now.

---

## Screenshots

<table>
  <tr>
    <td align="center"><strong>Home</strong></td>
    <td align="center"><strong>Book Grid</strong></td>
    <td align="center"><strong>Scripture Reading</strong></td>
    <td align="center"><strong>Translations</strong></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/home.png" width="200"/></td>
    <td><img src="docs/screenshots/books.png" width="200"/></td>
    <td><img src="docs/screenshots/reading.png" width="200"/></td>
    <td><img src="docs/screenshots/translations.png" width="200"/></td>
  </tr>
  <tr>
    <td align="center"><strong>Search</strong></td>
    <td align="center"><strong>Verse Actions</strong></td>
    <td align="center"><strong>Calendar</strong></td>
    <td align="center"><strong>Profile</strong></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/search.png" width="200"/></td>
    <td><img src="docs/screenshots/actions.png" width="200"/></td>
    <td><img src="docs/screenshots/calendar.png" width="200"/></td>
    <td><img src="docs/screenshots/profile.png" width="200"/></td>
  </tr>
</table>

### Multilingual Support

<table>
  <tr>
    <td align="center"><strong>Arabic</strong></td>
    <td align="center"><strong>Hindi</strong></td>
    <td align="center"><strong>Korean</strong></td>
    <td align="center"><strong>Tamil</strong></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/arabic.png" width="200"/></td>
    <td><img src="docs/screenshots/hindi.png" width="200"/></td>
    <td><img src="docs/screenshots/korean.png" width="200"/></td>
    <td><img src="docs/screenshots/tamil.png" width="200"/></td>
  </tr>
</table>

### Light & Dark Mode

<table>
  <tr>
    <td align="center"><strong>Dark Mode</strong></td>
    <td align="center"><strong>Light Mode</strong></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/dark_mode.png" width="200"/></td>
    <td><img src="docs/screenshots/light_mode.png" width="200"/></td>
  </tr>
</table>

---

## Supported Translations

The in-app catalog lists **2,633 translations** (KJV built in, 2,632 downloadable) in about **1,200 languages**. Translations download once from the open Bible data repos:

- [bible_db](https://github.com/AI2TH/bible_db): one SQLite database per translation, with FTS5
- [bible_db_languages_a_f](https://github.com/AI2TH/bible_db_languages_a_f), [g_m](https://github.com/AI2TH/bible_db_languages_g_m), [n_s](https://github.com/AI2TH/bible_db_languages_n_s), [t_z](https://github.com/AI2TH/bible_db_languages_t_z): translations grouped by file name
- [concordance_db](https://github.com/AI2TH/concordance_db): Strong's Greek and Hebrew, lexicons and cross-references

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Expo](https://expo.dev) SDK 56 + [React Native](https://reactnative.dev) 0.85 |
| **Router** | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing) |
| **Database** | [expo-sqlite](https://docs.expo.dev/versions/v56.0.0/sdk/sqlite/) — preseeded 648 MB offline database |
| **AI Engine** | [llama.rn](https://github.com/mybigday/llama.rn) — on-device GGUF inference (SmolLM2-135M, Q4_K_M, ~105 MB download) |
| **Audio** | [expo-audio](https://docs.expo.dev/versions/v56.0.0/sdk/audio/) — voice memo recording |
| **State** | [Zustand](https://zustand-demo.pmnd.rs/) — lightweight global state |
| **Storage** | [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) — high-performance key-value storage |
| **Animations** | [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) |
| **Typography** | [Google Fonts](https://fonts.google.com) — Outfit & Source Serif 4 |
| **Language** | TypeScript 5.6 |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Android Studio** with Android SDK installed
- **Java** — Android Studio's bundled JBR runtime (see below)

### Installation

```bash
# Clone the repository
git clone https://github.com/AI2TH/miktam_bible.git
cd miktam_bible

# Install dependencies
npm ci
```

### Running on Android Emulator

```bash
# Start the Metro bundler
npm run start

# In a separate terminal, run on Android
npm run android
```

### Environment Setup (Windows)

The native Android build requires `JAVA_HOME` to point to Android Studio's bundled JBR:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
```

Ensure `android/local.properties` has the correct SDK path:

```properties
sdk.dir=C\:\\Users\\<your-username>\\AppData\\Local\\Android\\Sdk
```

---

## Project Structure

```
bible/
├── app/                        # Expo Router screens
│   ├── (tabs)/                 # Bottom tab navigation
│   │   ├── index.tsx           #   Home tab (dashboard, VOTD, streak)
│   │   ├── read/               #   Read tab (book grid → chapters → verses)
│   │   ├── search.tsx          #   Full-text search
│   │   ├── calendar.tsx        #   Reading streak calendar
│   │   └── plans.tsx           #   Reading plans
│   ├── chat.tsx                # AI study assistant chat
│   ├── bookmarks.tsx           # Highlights & bookmarks
│   ├── recordings.tsx          # Voice memos
│   └── concordance/            # Strong's concordance lookup
│       ├── search.tsx          #   Search by word or number
│       └── [strongsNumber].tsx #   Detailed word view
│
├── src/
│   ├── ai/                     # LLM model management & inference
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 #   Design system (Text, Card, Button, Badge…)
│   │   ├── scripture/          #   Verse display, chapter reader
│   │   ├── chat/               #   Chat bubbles, input, prompts
│   │   ├── calendar/           #   Heatmap calendar
│   │   ├── recorder/           #   Audio record/play controls
│   │   └── shared/             #   Header, EmptyState, etc.
│   ├── database/               # SQLite schema & migrations
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # Business logic (bible, reading progress, recordings)
│   ├── stores/                 # Zustand state stores
│   ├── theme/                  # Color tokens, spacing, typography
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Constants, formatters, book translations
│
├── android/                    # Native Android project (Expo prebuild)
│   └── app/
│       └── src/main/assets/    # Preseeded binary assets
│           ├── bible.db        #   SQLite database (~648 MB)
│                               #   (the ~105 MB AI model downloads on demand)
│
├── assets/                     # App icons, splash screen, fonts
├── app.json                    # Expo configuration
├── package.json                # Dependencies & scripts
└── CLAUDE.md                   # Developer build guide
```

---

## Building for Production

### Android App Bundle (AAB)

```powershell
cd android
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
.\gradlew.bat bundleRelease
```

The signed AAB will be generated at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

### Android APK

```powershell
cd android
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
.\gradlew.bat assembleRelease
```

---

## Offline Architecture

Miktam Bible is designed to work **entirely offline** once translations and the AI model are downloaded:

```
┌─────────────────────────────────────────┐
│              Miktam Bible               │
│                                         │
│  ┌─────────┐  ┌──────────┐  ┌────────┐ │
│  │ Expo    │  │ SQLite   │  │ GGUF   │ │
│  │ Router  │  │ Database │  │ LLM    │ │
│  │         │  │ (648 MB) │  │(105 MB)│ │
│  └────┬────┘  └────┬─────┘  └───┬────┘ │
│       │            │             │      │
│  ┌────▼────────────▼─────────────▼────┐ │
│  │         React Native Runtime       │ │
│  │    (Hermes JS Engine + JSI)        │ │
│  └────────────────────────────────────┘ │
│                                         │
│  📖 2,600+ Versions  🔍 Concordance     │
│  🤖 AI Chat          🎙️ Voice Memos    │
│  📅 Reading Tracker  ⭐ Bookmarks       │
│                                         │
│   No Internet After First Downloads     │
└─────────────────────────────────────────┘
```

---

## License

This project is licensed under the **GNU General Public License v3.0**. See [LICENSE](LICENSE) for the full text. Parts generated from the Expo project template remain under the MIT License; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

---

<p align="center">
  <sub>Built with ❤️ for the glory of God</sub>
</p>
