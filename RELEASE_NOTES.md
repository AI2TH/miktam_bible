# Miktam Bible — Complete Release Notes (v0.0.0 – v1.1.8)

---

### 📲 Google Play Early Access Instructions
To get Early Access to Miktam Bible on Google Play, testers only need to do **ONE** of the following:

#### 🥇 Option 1: Join the Google Group (Recommended & Instant)
👉 **https://groups.google.com/g/ai2th**
- **How it works**:
  1. Click **Join Group** with the same Google account used on your Android device.
  2. Open the opt-in link: **https://play.google.com/apps/testing/miktam.bible**
  3. Click **"Become a tester"** and download directly from Google Play (**https://play.google.com/store/apps/details?id=miktam.bible**).
- **Why it's best**: 100% automated & instant. No manual approval required.

#### 📝 Option 2: Fill out the Form (Backup / Alternate Email)
👉 **https://forms.gle/jdLxXPVhDYm5ubpQ7**
- **When to use**:
  - If you prefer not to join Google Groups.
  - If your Google Play account email is different from your Google Group email.
- **How it works**:
  - Submit your Google Play email in the form.
  - The admin will enroll your email directly into the Google Play Console testing track.

---

## [v1.1.8] — 2026-10-16
### Brand Identity, Tab Consistency & Footer Deadzone Fix
- **Brand Medallion Logo Everywhere**:
  - The circular gold medallion icon is now consistently pinned across all main navigation headers (**Home**, **Holy Bible**, **Search**, **Calendar & Planner**, and **Reading Plans**).
- **Elimination of the "Invisible Bar Above Footer"**:
  - **Root Cause**: Android devices using 3-button system navigation (Back, Home, Recent) reported a 48dp (~130px) bottom window inset. When tab screens were wrapped in `<SafeAreaView>` without restricting edges, this 130px inset was applied inside the screen content, forcing the scrollable view to end 130px above the bottom tab bar.
  - **Fix**: Added `edges={['top', 'left', 'right']}` to all tab screen containers, allowing content to flow naturally to the bottom tab bar without any dead zone or cutoffs.
- **Seamless Navigation Bar**:
  - Removed top border line and elevation drop shadow from the bottom navigation tab bar for a modern, flat aesthetic.
- **Search Header Polish**:
  - Compacted the title to `"Search"` so the title, medallion logo, Concordance study button, theme switch, and streak counter fit comfortably on all screen sizes with zero ellipsis.
- **Android Native Manifest Alignment**:
  - Updated `android/app/build.gradle` `defaultConfig` to `versionCode 19` and `versionName "1.1.8"` so Google Play Console and Android OS recognize the release.

---

## [v1.1.7] — 2026-10-16
### Borderless Headers & Clean Tab Separation
- **Header Divider Line Elimination**:
  - Removed `borderBottomWidth: 1` divider line across all tab headers to eliminate the light grey/white horizontal bar above screen content.
- **Reactive System Status Bar**:
  - Fixed status bar styling to respond immediately to theme toggles without flashing or staying inverted.
- **Root Layout Hook Ordering Fix**:
  - Fixed React Hook ordering in `app/_layout.tsx` to eliminate intermittent `Rendered more hooks than during previous render` runtime warnings during database initialization.

---

## [v1.1.6] — 2026-10-16
### Unified Header Architecture & Navigation Realignment
- **Dedicated 5th Bottom Tab ("Plans")**:
  - Split Reading Plans out of the Calendar tab into its own dedicated bottom navigation tab for 1-tap direct access.
- **Universal Top Header**:
  - Standardized all 5 main tabs on a shared header component providing equal top bar height and visual rhythm across the entire app.
- **1-Tap Quick Theme Toggle**:
  - Pinned a theme switch icon (`🌙` / `☀️`) on the top right of all tab headers for instant switching between Deep Night Dark Mode and Warm Parchment Light Mode without leaving the screen.
- **Reactive Reading Streak Counter**:
  - Globalized the reading streak badge (`🔥 count`) to update live across every tab header upon reading scripture.

---

## [v1.1.5] — 2026-10-16
### Calendar & Planner Reorganization & Promise Scriptures
- **Promise Scriptures on Top**:
  - Reorganized Calendar screen layout to feature **Promise of the Year** and **Promise of the Month** at the top of the screen in gold metallic cards with 1-tap chapter navigation.
- **Multi-Verse Sharing**:
  - Added support for selecting multiple verses in the Bible reader and sharing them formatted as a clean, cohesive passage.
- **Daily Reading Reminder Alarms**:
  - Integrated Expo Notifications for custom daily alarms reminding users to complete their assigned readings.

---

## [v1.1.4] — 2026-10-16
### Bible Reading Plan Generator & Church Meeting Planner
- **Custom Bible Reading Plan Generator**:
  - Added plan creation algorithms for **1 Year (365 Days)**, **6 Months (180 Days)**, **3 Months (90 Days)**, and custom day ranges with automatic chapters-per-day calculation.
- **Standardized Reading Plans**:
  - Built-in **Navigators Discipleship Plan** (4 daily tracks: Gospels, Law/History, Psalms/Wisdom, and Epistles).
  - Built-in **CSB 90-Day Plan** (cover-to-cover intensive study).
- **Daily Calendar To-Do System**:
  - Daily to-do checklists tied to specific calendar dates with pending/completed indicators.
- **Church Meeting Planner**:
  - Feature to record church meeting dates, sermon topics, agendas, and pastoral notes directly within the calendar.

---

## [v1.1.3] — 2026-10-15
### Catalog Scale & Download Filters
- **5,639 Remote Bible Catalog**:
  - Audited and synced catalog with 5,639 SQLite databases across all 5 AI2TH storage repositories.
- **"Downloaded" Filter Chip**:
  - Added quick filter chip in translation picker to instantly show only offline-installed Bibles.
- **Dynamic Language Counter**:
  - Live header badge dynamically counting supported global languages (`2,538+ Langs`).

---

## [v1.1.2] — 2026-10-15
### Multi-Repository Bible Distribution
- **Partitioned eBible Infrastructure**:
  - Scaled remote Bible storage across 5 GitHub repositories (`ebible-part1` through `ebible-part5`).
- **Parallel Translation Views**:
  - Optimized SQLite attachment queries for smooth parallel reading across downloaded versions.

---

## [v1.1.1] — 2026-10-15
### Typography Engine & Indic/Tamil Script Support
- **Complex Script Typography Fix**:
  - Resolved Tamil, Kannada, and Indic font clipping and overlapping lines using script-aware line-height factors (`lineHeight * 1.35`) and native system font fallback cascades.
- **Dual-Language Bilingual Mode**:
  - Side-by-side bilingual parallel scripture reading allowing instant comparison between English (KJV) and native language translations.

---

## [v1.1.0] — 2026-10-14
### Lean APK & High-Speed Database Architecture
- **Slim APK Database (KJV Default)**:
  - Reduced initial installation size by bundling only the core KJV database, downloading additional translations on-demand.
- **SQLite ATTACH Downloader**:
  - High-speed direct SQLite attachment for downloading and merging external translation databases seamlessly.
- **Modal Stability**:
  - Fixed BottomSheet collapse bugs and touch bubbling on modal backdrops.
- **Scripture Text Sanitization**:
  - Enforced clean scripture rendering by stripping raw XML/Strong's markup from parallel reading views.

---

## [v1.0.8 – v1.0.9] — 2026-10-13
### Search Engine & Concurrency Hardening
- **Isolated SQLite Search Connection**:
  - Separated search queries into dedicated database handles to eliminate database locking during heavy typing.
- **Live Search Debounce & Pagination**:
  - 300ms live typing debounce with token cancellation and infinite scroll pagination.
- **Navigation Race Resolution**:
  - Eliminated Android modal transition race conditions and enforced auto-scroll-to-top on chapter navigation.

---

## [v0.0.0 – v1.0.0] — Initial Foundation (Phase 1)
### Offline-First Theological Study Companion
- **Complete KJV Bible Database**:
  - Bundled King James Version with full Old and New Testament chapters and verse numbering.
- **100% Offline AI Study Assistant**:
  - On-device theological reasoning, contextual definitions, and scripture explanation powered by local LLM integration.
- **Strong's Hebrew & Greek Concordance**:
  - Complete Strong's dictionary lookup, word counts, and biblical lexicon integration.
- **Voice Reflections & Audio Notes**:
  - Built-in voice recorder with playback for recording personal study reflections.
- **Study Tools**:
  - Color-coded verse highlighting, custom bookmarking, and personal notes.
  - Daily Verse of the Day (VOTD) with full chapter context navigation.
- **Bespoke Theme Engine**:
  - Designed from the ground up with Warm Parchment (Light) and Deep Night Gold (Dark) themes.
