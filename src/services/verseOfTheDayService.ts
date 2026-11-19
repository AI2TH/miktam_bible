import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { getVerse } from './bibleService';
import { getBookName } from '../utils/bookTranslations';
import { cleanVerseText } from '../utils/bibleUtils';
import { generateUUID } from '../utils/uuid';
import { FALLBACK_SEED, pickDailyVerse } from './dailyVerse';

export interface VerseOfTheDay {
  book: number;
  chapter: number;
  verse: number;
  ref: string;
  text: string;
}

const USER_SEED_KEY = 'miktam_user_unique_seed';
const DAILY_VOTD_KEY = 'miktam_daily_votd';

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
    // A fixed seed keeps Home and the notification on the same verse
    return FALLBACK_SEED;
  }
}

/**
 * The verse coordinates for a date (today by default): a date-seeded random
 * pick from the curated pool. The Home screen and the daily notification both
 * use this, so they always show the same verse for a date. Today's pick is
 * cached so it stays put for the rest of the day.
 */
export async function getDailyVerseCoordinates(targetDateStr?: string): Promise<{ book: number; chapter: number; verse: number }> {
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const dateKey = targetDateStr || todayKey;
  const isToday = dateKey === todayKey;

  try {
    if (isToday) {
      const cachedStr = await AsyncStorage.getItem(DAILY_VOTD_KEY);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached.date === dateKey && cached.book && cached.chapter && cached.verse) {
          return { book: cached.book, chapter: cached.chapter, verse: cached.verse };
        }
      }
    }

    const choice = pickDailyVerse(dateKey, await getUserSeed());

    // Only today's pick is cached; scheduling future notifications must not overwrite it
    if (isToday) {
      await AsyncStorage.setItem(
        DAILY_VOTD_KEY,
        JSON.stringify({ date: dateKey, book: choice.b, chapter: choice.c, verse: choice.v })
      );
    }

    return { book: choice.b, chapter: choice.c, verse: choice.v };
  } catch (e) {
    console.warn('[VOTD] Error reading daily verse cache, using the fixed seed:', e);
    const fallback = pickDailyVerse(dateKey, FALLBACK_SEED);
    return { book: fallback.b, chapter: fallback.c, verse: fallback.v };
  }
}

/**
 * Loads the Verse of the Day in the requested Bible version
 */
export async function loadVerseOfTheDay(versionId: string, targetDateStr?: string): Promise<VerseOfTheDay> {
  const normVer = (versionId || 'kjv').toLowerCase().trim();
  const coords = await getDailyVerseCoordinates(targetDateStr);

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
