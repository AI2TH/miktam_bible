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
