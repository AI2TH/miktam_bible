/**
 * The daily verse ("Verse of the Day"): a date-seeded pick from a curated pool.
 *
 * The Home screen and the daily notification both call pickDailyVerse() with
 * the same seed and date, so the notification always carries the verse the
 * Home screen shows that day.
 *
 * Pure: no React Native imports, so node:test can run it.
 */

export interface DailyVerseRef {
  b: number;
  c: number;
  v: number;
}

/** Seed used when the per-install seed cannot be read, so the pick stays stable */
export const FALLBACK_SEED = 'miktam';

/** Identifier prefix of daily verse notifications (one per date, e.g. miktam_votd_2026-11-15_0730) */
export const DAILY_VERSE_PREFIX = 'miktam_votd_';

/**
 * The daily verse notification is on by default at 12:00 AM for everyone,
 * new installs and existing users alike. A time the user picks, or turning it
 * off, is kept.
 */
export const DEFAULT_DAILY_VERSE_TIME = '00:00';

/** Stored setting value for "the user turned the daily verse notification off" */
export const DAILY_VERSE_OFF = 'off';

/**
 * The daily verse time from the stored setting ('dailyVerseTime'):
 * - nothing stored (new install, or upgraded without ever choosing): the 12:00 AM default;
 * - 'off' (or '' as written by an earlier build of this change): off, the user turned it off;
 * - a valid 'HH:mm': the user's own time, kept as is.
 * Anything else falls back to the default.
 */
export function resolveDailyVerseTime(stored: string | null | undefined): string | null {
  if (stored === undefined || stored === null) return DEFAULT_DAILY_VERSE_TIME;
  if (stored === DAILY_VERSE_OFF || stored === '') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(stored.trim());
  if (match && Number(match[1]) <= 23 && Number(match[2]) <= 59) return stored.trim();
  return DEFAULT_DAILY_VERSE_TIME;
}

/** What to store for a user's choice: their 'HH:mm', or DAILY_VERSE_OFF */
export function dailyVerseSettingValue(time: string | null): string {
  return time ? time : DAILY_VERSE_OFF;
}

/** Days ahead that get a daily verse notification */
export const DAILY_VERSE_WINDOW_DAYS = 14;

// Curated pool of 130+ beloved, inspiring scripture passages across OT and NT
export const DAILY_VERSE_POOL: ReadonlyArray<DailyVerseRef> = [
  // Pentateuch & Historical
  { b: 1, c: 1, v: 1 },    // Gen 1:1
  { b: 1, c: 1, v: 3 },    // Gen 1:3
  { b: 1, c: 28, v: 15 },  // Gen 28:15
  { b: 2, c: 14, v: 14 },  // Exo 14:14
  { b: 4, c: 6, v: 24 },   // Num 6:24
  { b: 5, c: 6, v: 5 },    // Deu 6:5
  { b: 5, c: 31, v: 6 },   // Deu 31:6
  { b: 5, c: 31, v: 8 },   // Deu 31:8
  { b: 6, c: 1, v: 9 },    // Jos 1:9
  { b: 6, c: 24, v: 15 },  // Jos 24:15
  { b: 9, c: 16, v: 7 },   // 1Sa 16:7
  { b: 13, c: 16, v: 11 }, // 1Ch 16:11
  { b: 14, c: 7, v: 14 },  // 2Ch 7:14
  { b: 16, c: 8, v: 10 },  // Neh 8:10
  { b: 18, c: 19, v: 25 }, // Job 19:25

  // Psalms
  { b: 19, c: 1, v: 1 },   // Psa 1:1
  { b: 19, c: 16, v: 8 },  // Psa 16:8
  { b: 19, c: 16, v: 11 }, // Psa 16:11
  { b: 19, c: 18, v: 2 },  // Psa 18:2
  { b: 19, c: 19, v: 14 }, // Psa 19:14
  { b: 19, c: 23, v: 1 },  // Psa 23:1
  { b: 19, c: 23, v: 4 },  // Psa 23:4
  { b: 19, c: 23, v: 6 },  // Psa 23:6
  { b: 19, c: 27, v: 1 },  // Psa 27:1
  { b: 19, c: 28, v: 7 },  // Psa 28:7
  { b: 19, c: 34, v: 8 },  // Psa 34:8
  { b: 19, c: 37, v: 4 },  // Psa 37:4
  { b: 19, c: 37, v: 5 },  // Psa 37:5
  { b: 19, c: 46, v: 1 },  // Psa 46:1
  { b: 19, c: 46, v: 10 }, // Psa 46:10
  { b: 19, c: 51, v: 10 }, // Psa 51:10
  { b: 19, c: 56, v: 3 },  // Psa 56:3
  { b: 19, c: 84, v: 11 }, // Psa 84:11
  { b: 19, c: 91, v: 1 },  // Psa 91:1
  { b: 19, c: 91, v: 11 }, // Psa 91:11
  { b: 19, c: 100, v: 3 }, // Psa 100:3
  { b: 19, c: 103, v: 1 }, // Psa 103:1
  { b: 19, c: 103, v: 8 }, // Psa 103:8
  { b: 19, c: 107, v: 1 }, // Psa 107:1
  { b: 19, c: 118, v: 24 },// Psa 118:24
  { b: 19, c: 119, v: 105 },// Psa 119:105
  { b: 19, c: 121, v: 1 }, // Psa 121:1
  { b: 19, c: 121, v: 2 }, // Psa 121:2
  { b: 19, c: 139, v: 14 },// Psa 139:14
  { b: 19, c: 143, v: 8 }, // Psa 143:8
  { b: 19, c: 145, v: 18 },// Psa 145:18
  { b: 19, c: 150, v: 6 }, // Psa 150:6

  // Proverbs & Wisdom
  { b: 20, c: 3, v: 5 },   // Pro 3:5
  { b: 20, c: 3, v: 6 },   // Pro 3:6
  { b: 20, c: 4, v: 23 },  // Pro 4:23
  { b: 20, c: 16, v: 3 },  // Pro 16:3
  { b: 20, c: 16, v: 9 },  // Pro 16:9
  { b: 20, c: 17, v: 17 }, // Pro 17:17
  { b: 20, c: 18, v: 10 }, // Pro 18:10
  { b: 20, c: 27, v: 17 }, // Pro 27:17
  { b: 21, c: 3, v: 1 },   // Ecc 3:1
  { b: 21, c: 3, v: 11 },  // Ecc 3:11

  // Prophets
  { b: 23, c: 9, v: 6 },   // Isa 9:6
  { b: 23, c: 26, v: 3 },  // Isa 26:3
  { b: 23, c: 40, v: 29 }, // Isa 40:29
  { b: 23, c: 40, v: 31 }, // Isa 40:31
  { b: 23, c: 41, v: 10 }, // Isa 41:10
  { b: 23, c: 43, v: 2 },  // Isa 43:2
  { b: 23, c: 53, v: 5 },  // Isa 53:5
  { b: 23, c: 54, v: 17 }, // Isa 54:17
  { b: 23, c: 55, v: 6 },  // Isa 55:6
  { b: 23, c: 55, v: 11 }, // Isa 55:11
  { b: 23, c: 60, v: 1 },  // Isa 60:1
  { b: 24, c: 17, v: 7 },  // Jer 17:7
  { b: 24, c: 29, v: 11 }, // Jer 29:11
  { b: 24, c: 31, v: 3 },  // Jer 31:3
  { b: 24, c: 33, v: 3 },  // Jer 33:3
  { b: 25, c: 3, v: 22 },  // Lam 3:22
  { b: 25, c: 3, v: 23 },  // Lam 3:23
  { b: 33, c: 6, v: 8 },   // Mic 6:8
  { b: 34, c: 1, v: 7 },   // Nah 1:7
  { b: 36, c: 3, v: 17 },  // Zep 3:17
  { b: 38, c: 4, v: 6 },   // Zec 4:6
  { b: 39, c: 4, v: 2 },   // Mal 4:2

  // Gospels
  { b: 40, c: 5, v: 14 },  // Mat 5:14
  { b: 40, c: 5, v: 16 },  // Mat 5:16
  { b: 40, c: 6, v: 33 },  // Mat 6:33
  { b: 40, c: 7, v: 7 },   // Mat 7:7
  { b: 40, c: 11, v: 28 }, // Mat 11:28
  { b: 40, c: 19, v: 26 }, // Mat 19:26
  { b: 40, c: 28, v: 20 }, // Mat 28:20
  { b: 41, c: 9, v: 23 },  // Mrk 9:23
  { b: 41, c: 10, v: 27 }, // Mrk 10:27
  { b: 41, c: 11, v: 24 }, // Mrk 11:24
  { b: 42, c: 1, v: 37 },  // Luk 1:37
  { b: 42, c: 6, v: 31 },  // Luk 6:31
  { b: 43, c: 1, v: 1 },   // Jhn 1:1
  { b: 43, c: 1, v: 14 },  // Jhn 1:14
  { b: 43, c: 3, v: 16 },  // Jhn 3:16
  { b: 43, c: 8, v: 12 },  // Jhn 8:12
  { b: 43, c: 10, v: 10 }, // Jhn 10:10
  { b: 43, c: 11, v: 25 }, // Jhn 11:25
  { b: 43, c: 14, v: 6 },  // Jhn 14:6
  { b: 43, c: 14, v: 27 }, // Jhn 14:27
  { b: 43, c: 15, v: 5 },  // Jhn 15:5
  { b: 43, c: 16, v: 33 }, // Jhn 16:33

  // Acts & Epistles
  { b: 44, c: 1, v: 8 },   // Act 1:8
  { b: 45, c: 1, v: 16 },  // Rom 1:16
  { b: 45, c: 5, v: 1 },   // Rom 5:1
  { b: 45, c: 5, v: 8 },   // Rom 5:8
  { b: 45, c: 8, v: 1 },   // Rom 8:1
  { b: 45, c: 8, v: 28 },  // Rom 8:28
  { b: 45, c: 8, v: 31 },  // Rom 8:31
  { b: 45, c: 8, v: 38 },  // Rom 8:38
  { b: 45, c: 10, v: 9 },  // Rom 10:9
  { b: 45, c: 12, v: 2 },  // Rom 12:2
  { b: 45, c: 12, v: 12 }, // Rom 12:12
  { b: 45, c: 15, v: 13 }, // Rom 15:13
  { b: 46, c: 10, v: 13 }, // 1Co 10:13
  { b: 46, c: 13, v: 4 },  // 1Co 13:4
  { b: 46, c: 13, v: 13 }, // 1Co 13:13
  { b: 46, c: 15, v: 57 }, // 1Co 15:57
  { b: 47, c: 4, v: 16 },  // 2Co 4:16
  { b: 47, c: 5, v: 7 },   // 2Co 5:7
  { b: 47, c: 5, v: 17 },  // 2Co 5:17
  { b: 47, c: 12, v: 9 },  // 2Co 12:9
  { b: 48, c: 2, v: 20 },  // Gal 2:20
  { b: 48, c: 5, v: 22 },  // Gal 5:22
  { b: 48, c: 6, v: 9 },   // Gal 6:9
  { b: 49, c: 2, v: 8 },   // Eph 2:8
  { b: 49, c: 2, v: 10 },  // Eph 2:10
  { b: 49, c: 3, v: 20 },  // Eph 3:20
  { b: 49, c: 4, v: 32 },  // Eph 4:32
  { b: 49, c: 6, v: 10 },  // Eph 6:10
  { b: 50, c: 1, v: 6 },   // Php 1:6
  { b: 50, c: 4, v: 4 },   // Php 4:4
  { b: 50, c: 4, v: 6 },   // Php 4:6
  { b: 50, c: 4, v: 7 },   // Php 4:7
  { b: 50, c: 4, v: 13 },  // Php 4:13
  { b: 50, c: 4, v: 19 },  // Php 4:19
  { b: 51, c: 3, v: 12 },  // Col 3:12
  { b: 51, c: 3, v: 17 },  // Col 3:17
  { b: 52, c: 5, v: 16 },  // 1Th 5:16
  { b: 52, c: 5, v: 18 },  // 1Th 5:18
  { b: 53, c: 3, v: 3 },   // 2Th 3:3
  { b: 54, c: 4, v: 12 },  // 1Ti 4:12
  { b: 55, c: 1, v: 7 },   // 2Ti 1:7
  { b: 55, c: 3, v: 16 },  // 2Ti 3:16
  { b: 58, c: 4, v: 12 },  // Heb 4:12
  { b: 58, c: 4, v: 16 },  // Heb 4:16
  { b: 58, c: 11, v: 1 },  // Heb 11:1
  { b: 58, c: 11, v: 6 },  // Heb 11:6
  { b: 58, c: 12, v: 1 },  // Heb 12:1
  { b: 58, c: 12, v: 2 },  // Heb 12:2
  { b: 58, c: 13, v: 8 },  // Heb 13:8
  { b: 59, c: 1, v: 2 },   // Jas 1:2
  { b: 59, c: 1, v: 5 },   // Jas 1:5
  { b: 59, c: 1, v: 17 },  // Jas 1:17
  { b: 59, c: 4, v: 8 },   // Jas 4:8
  { b: 60, c: 5, v: 7 },   // 1Pe 5:7
  { b: 61, c: 1, v: 3 },   // 2Pe 1:3
  { b: 62, c: 1, v: 9 },   // 1Jn 1:9
  { b: 62, c: 3, v: 1 },   // 1Jn 3:1
  { b: 62, c: 4, v: 4 },   // 1Jn 4:4
  { b: 62, c: 4, v: 18 },  // 1Jn 4:18
  { b: 62, c: 4, v: 19 },  // 1Jn 4:19
  { b: 66, c: 3, v: 20 },  // Rev 3:20
  { b: 66, c: 21, v: 4 },  // Rev 21:4
];

/**
 * 32-bit FNV-1a with a murmur3 finalizer, so seeds that differ in one
 * character give unrelated values.
 */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Small seeded PRNG (mulberry32), returns floats in [0, 1) */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seeded shuffle of 0..n-1 for one cycle through the pool */
function cycleOrder(seed: string, cycle: number, n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  const rand = mulberry32(hashString(`${seed}|cycle|${cycle}`));
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Days since 1970-01-01 for a 'yyyy-MM-dd' date (calendar days, no time zone) */
function dayNumberOf(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/**
 * Index into a pool of `poolSize` for a 'yyyy-MM-dd' date and a seed.
 *
 * The days are split into cycles of `poolSize` days, and each cycle walks
 * through its own seeded shuffle of the pool. So the order looks random, a
 * verse does not come back until the whole pool has been used, and the same
 * verse never shows two days in a row (also across a cycle boundary).
 */
export function pickDailyVerseIndex(dateKey: string, seed: string, poolSize: number): number {
  if (poolSize <= 0) return -1;
  if (poolSize === 1) return 0;
  const day = dayNumberOf(dateKey);
  const cycle = Math.floor(day / poolSize);
  const pos = day - cycle * poolSize;
  const order = cycleOrder(seed, cycle, poolSize);
  if (pos <= 1) {
    // The first day of a cycle must differ from the last day of the previous one
    const previousLast = cycleOrder(seed, cycle - 1, poolSize)[poolSize - 1];
    if (order[0] === previousLast) [order[0], order[1]] = [order[1], order[0]];
  }
  return order[pos];
}

/** The verse for a date: the same date and seed always give the same verse */
export function pickDailyVerse(
  dateKey: string,
  seed: string,
  pool: ReadonlyArray<DailyVerseRef> = DAILY_VERSE_POOL
): DailyVerseRef {
  return pool[pickDailyVerseIndex(dateKey, seed, pool.length)];
}

/** Local calendar date as 'yyyy-MM-dd' */
function dateKeyOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * When the daily verse notifications fire: one per date at the user's time,
 * for the next `days` days, leaving out a time already past today. None when
 * the notification is off (time null). The default time is applied by
 * resolveDailyVerseTime(), not here.
 */
export function planDailyVerseNotifications(
  now: Date,
  time: string | null | undefined,
  days: number = DAILY_VERSE_WINDOW_DAYS
): { id: string; dateKey: string; fireAt: Date }[] {
  const match = time ? /^(\d{1,2}):(\d{2})$/.exec(time.trim()) : null;
  if (!match) return [];
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return [];

  const out: { id: string; dateKey: string; fireAt: Date }[] = [];
  for (let i = 0; i < days; i++) {
    const fireAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, minute, 0, 0);
    if (fireAt.getTime() <= now.getTime()) continue;
    const dateKey = dateKeyOf(fireAt);
    // The time is part of the id, so changing the time replaces every notification
    const hhmm = `${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}`;
    out.push({ id: `${DAILY_VERSE_PREFIX}${dateKey}_${hhmm}`, dateKey, fireAt });
  }
  return out;
}
