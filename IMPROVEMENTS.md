# Miktam Bible — Improvements

What still needs work, in priority order. Last reviewed: November 2026 (after the code review in #10).

---

## P0 — Data safety and privacy

### 1. Re-seeding deletes all user data
- **What:** `database.ts` deletes the whole `bible.db` when `seeded_bible_db_version` changes. Notes, highlights, recordings and reading plans live in the same file, so an app update that bumps the seed version wipes them.
- **How to fix:** move user tables (notes, highlights, bookmarks, recordings, plans, progress) into a separate `user.db` and `ATTACH` it. For existing installs, copy those tables out before re-seeding, then back in. Add a test that bumps the seed version and checks notes survive.

### 2. The database can be seeded from shared storage
- **What:** `copySourceDatabase` tries `file:///sdcard/Download/bible.db` first, so any file someone places there becomes the app's database.
- **How to fix:** remove that path from release builds (keep it behind `__DEV__` for testing), and verify the bundled asset's checksum before copying.

### 3. Placeholder data files in the language repos — #8
2,995 identical 28 KB `.db` files in `bible_db_languages_*` hold 17 English KJV verses but are labelled as other languages. Delete them, and add a CI check in each data repo that rejects files with fewer than 100 verses or mismatched language metadata.

---

## P1 — Correctness

### 4. Two Verse of the Day notifications every midnight
Both the date-specific notifications and a DAILY 00:00 "fallback" are scheduled. Keep one (the date-specific ones match the Home screen) and cancel the other on upgrade.

### 5. Search pagination repeats or skips results
`searchService` applies the same OFFSET to each tier (phrase / AND / OR) and merges per page; `hasMore` is wrong when a page returns more than 20 rows; `useSearch.loadMore` can fetch the same page twice. Fix by running one ranked query (`UNION ALL` with a tier column, `ORDER BY tier, rank LIMIT ? OFFSET ?`) and guarding `loadMore` with an in-flight flag.

### 6. Calendar uses a stale date
The `focus` listener in `calendar.tsx` captures `selectedDate` when it is registered, and its `active` cancel flag is passed by value. Read the date from a ref and use an `AbortController`-style flag object.

### 7. Navigation stacks duplicate screens
`router.replace` is used for "back" and from modals into `(tabs)/read/...` (bookmarks, studies, chat citations, concordance, reader). Use `router.back()` / `router.navigate` and test each flow on a device.

### 8. Non-atomic writes
Starting a reading plan deactivates the old plan outside the transaction, and the JSON Bible import deletes verses then inserts them across many transactions. An interrupted import leaves a partial Bible marked as downloaded. Wrap each in one transaction, and only mark a translation downloaded after a verse-count check.

### 9. Silent failures in UI handlers
Several async handlers (plans, calendar, bookmarks, studies) have no `try/catch`. Add error handling with a toast, and a global unhandled-rejection logger in `__DEV__`.

### 10. Concordance lookups can overwrite each other
`useConcordance` has no stale-request guard and shares one `loading` flag across loaders. Track a request id per lookup and separate loading states.

### 11. Reading stats overcount
They count rows rather than distinct chapters, and "this week" covers 8 days. Use `COUNT(DISTINCT book_number || ':' || chapter)` and a 7-day window.

### 12. Whisper on Android may reject the audio format
Android records `.m4a` (AAC), while whisper.cpp expects 16 kHz mono WAV. Record WAV/PCM on Android (expo-audio recording options) or convert before transcription. Verify on a device.

---

## P2 — Product

### 13. Book names in every language
Only 19 languages have native book names; the others fall back to English. Ship book names per translation from the data repos' metadata where available.

### 14. Hybrid (meaning-based) search for the AI assistant
The pipeline is ready for FTS5 + vector search with reciprocal rank fusion, but there is no embedding model yet. Add a small on-device embedding model (e.g. MiniLM, quantized) and `sqlite-vec`.

### 15. Honest model choices — #5
Rename the 135M model's id to match what it is (with a migration), and only list models whose download URL is checked.

---

## P3 — Process

### 16. Dependency install needs `--legacy-peer-deps`
`npm ci` fails on `main` with a React peer-dependency conflict. Align versions so a plain `npm ci` works.

### 17. Tests and CI
Add GitHub Actions running `npx tsc --noEmit` and `npm test` on every PR, and grow the `node:test` suite started in #10 (database migrations, search, plans).

### 18. Release notes encoding
The GitHub release bodies were double-encoded UTF-8 (fixed by hand in November 2026). Publish release notes from a UTF-8 file with `gh release create --notes-file`.
