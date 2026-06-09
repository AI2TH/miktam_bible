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
