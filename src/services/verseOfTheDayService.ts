import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerse } from './bibleService';
import { getBookName } from '../utils/bookTranslations';
import { cleanVerseText } from '../utils/bibleUtils';
import { generateUUID } from '../utils/uuid';

export interface VerseOfTheDay {
  book: number;
  chapter: number;
  verse: number;
  ref: string;
  text: string;
}

// Curated pool of 130+ beloved, inspiring scripture passages across OT and NT
const VOTD_POOL: Array<{ b: number; c: number; v: number }> = [
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

const USER_SEED_KEY = 'miktam_user_unique_seed';
const DAILY_VOTD_KEY = 'miktam_daily_votd';

/**
 * Simple string hash to generate a deterministic pseudo-random integer
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns or generates a persistent unique user seed for this installation
 */
async function getUserSeed(): Promise<string> {
  try {
    let seed = await AsyncStorage.getItem(USER_SEED_KEY);
    if (!seed) {
      seed = generateUUID();
      await AsyncStorage.setItem(USER_SEED_KEY, seed);
    }
    return seed;
  } catch {
    return 'default_seed_' + Math.random();
  }
}

/**
 * Gets or selects today's random verse coordinates for the current user
 */
export async function getDailyVerseCoordinates(): Promise<{ book: number; chapter: number; verse: number }> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const cachedStr = await AsyncStorage.getItem(DAILY_VOTD_KEY);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (cached.date === today && cached.book && cached.chapter && cached.verse) {
        return { book: cached.book, chapter: cached.chapter, verse: cached.verse };
      }
    }

    // Generate new random verse for this user for today
    const userSeed = await getUserSeed();
    const hashVal = hashString(`${userSeed}_${today}`);
    const selectedIdx = hashVal % VOTD_POOL.length;
    const choice = VOTD_POOL[selectedIdx];

    await AsyncStorage.setItem(
      DAILY_VOTD_KEY,
      JSON.stringify({ date: today, book: choice.b, chapter: choice.c, verse: choice.v })
    );

    return { book: choice.b, chapter: choice.c, verse: choice.v };
  } catch (e) {
    console.warn('[VOTD] Error reading daily verse cache, using random fallback:', e);
    const fallback = VOTD_POOL[Math.floor(Math.random() * VOTD_POOL.length)];
    return { book: fallback.b, chapter: fallback.c, verse: fallback.v };
  }
}

/**
 * Loads the Verse of the Day in the requested Bible version
 */
export async function loadVerseOfTheDay(versionId: string): Promise<VerseOfTheDay> {
  const normVer = (versionId || 'kjv').toLowerCase().trim();
  const coords = await getDailyVerseCoordinates();

  let verseRow = await getVerse(normVer, coords.book, coords.chapter, coords.verse);
  if (!verseRow && normVer !== 'kjv') {
    // Fallback to KJV if not found in current translation
    verseRow = await getVerse('kjv', coords.book, coords.chapter, coords.verse);
  }

  const bookTitle = getBookName(coords.book, normVer);
  const ref = `${bookTitle} ${coords.chapter}:${coords.verse}`;

  if (verseRow && verseRow.text) {
    return {
      book: coords.book,
      chapter: coords.chapter,
      verse: coords.verse,
      ref,
      text: cleanVerseText(verseRow.text),
    };
  }

  // Graceful fallback if database read fails
  return {
    book: 43,
    chapter: 3,
    verse: 16,
    ref: `${getBookName(43, normVer)} 3:16`,
    text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
  };
}
