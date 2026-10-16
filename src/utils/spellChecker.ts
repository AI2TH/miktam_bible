import { initSearchDatabase } from '../services/database';

let dictionary: string[] | null = null;
let dictionarySet: Set<string> | null = null;

// Standard Levenshtein distance with 2-row memory optimization
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prevRow = new Array(b.length + 1);
  let currRow = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    currRow[0] = i;
    for (let j = 1; j <= b.length; j++) {
      if (a.charAt(i - 1) === b.charAt(j - 1)) {
        currRow[j] = prevRow[j - 1];
      } else {
        currRow[j] = Math.min(
          prevRow[j - 1] + 1, // substitution
          Math.min(
            currRow[j - 1] + 1, // insertion
            prevRow[j] + 1     // deletion
          )
        );
      }
    }
    for (let j = 0; j <= b.length; j++) {
      prevRow[j] = currRow[j];
    }
  }

  return prevRow[b.length];
}

export async function initDictionary() {
  if (dictionary !== null) return;
  const db = await initSearchDatabase();
  try {
    // Only load English words for now
    const rows = await db.getAllAsync<{ word: string }>('SELECT word FROM concordance_index WHERE lang = "en"');
    dictionary = rows.map(r => r.word.toLowerCase());
    dictionarySet = new Set(dictionary);
  } catch (e) {
    console.warn("[SpellChecker] Could not load dictionary", e);
    dictionary = [];
    dictionarySet = new Set();
  }
}

export async function correctWord(word: string): Promise<string> {
  if (!dictionary || !dictionarySet) await initDictionary();
  const lowerWord = word.toLowerCase();
  
  // O(1) exact match check
  if (dictionarySet!.has(lowerWord)) {
    return word;
  }

  // Find closest match
  let minDistance = Infinity;
  let closestWord = word;

  for (const dictWord of dictionary!) {
    // Optimization: skip words with huge length differences
    if (Math.abs(dictWord.length - lowerWord.length) > 2) continue;
    
    const dist = levenshtein(lowerWord, dictWord);
    if (dist < minDistance) {
      minDistance = dist;
      closestWord = dictWord;
    }
  }

  // Only auto-correct if distance is small enough (e.g., 1 or 2 edits)
  // Require stricter distance (1) for short words
  const maxDistance = lowerWord.length <= 4 ? 1 : 2;
  
  if (minDistance <= maxDistance) {
    // Preserve original capitalization if it was fully capitalized or title case
    if (word === word.toUpperCase()) return closestWord.toUpperCase();
    if (word[0] === word[0].toUpperCase()) return closestWord.charAt(0).toUpperCase() + closestWord.slice(1);
    return closestWord;
  }

  return word;
}

export async function correctQuery(query: string): Promise<{ corrected: string, hasChanges: boolean }> {
  // Split query into words and non-words
  const tokens = query.split(/([a-zA-Z]+)/);
  let hasChanges = false;
  
  const correctedTokens = await Promise.all(tokens.map(async (token) => {
    // Only correct alphabetic words longer than 2 characters
    if (/^[a-zA-Z]{3,}$/.test(token)) {
      const corrected = await correctWord(token);
      if (corrected.toLowerCase() !== token.toLowerCase()) {
        hasChanges = true;
      }
      return corrected;
    }
    return token;
  }));

  return {
    corrected: correctedTokens.join(''),
    hasChanges
  };
}
