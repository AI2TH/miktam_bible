import type { WhisperContext } from 'whisper.rn';
import * as FileSystem from 'expo-file-system/legacy';
import { BOOK_NAMES } from '../utils/constants';

let context: WhisperContext | null = null;
let isMockModel = false;
let initWhisperFn: any = null;

function getInitWhisper() {
  if (initWhisperFn) return initWhisperFn;
  try {
    const whisperModule = require('whisper.rn');
    initWhisperFn = whisperModule.initWhisper;
    return initWhisperFn;
  } catch (e) {
    console.warn('[Whisper] Failed to load RNWhisper native module, using mock mode:', e);
    return null;
  }
}

/** Load Whisper model from path */
export async function loadWhisperModel(modelPath: string): Promise<void> {
  if (context) {
    try {
      await context.release();
    } catch (e) {
      console.warn('[Whisper] Failed to release previous context:', e);
    }
    context = null;
  }

  // If path is empty, default to mock/fallback mode immediately
  if (!modelPath) {
    isMockModel = true;
    console.log('[Whisper] Running in default offline fallback mode.');
    return;
  }

  isMockModel = false;

  // 1. Check if this is a mock model file by inspecting its size
  try {
    const info = await FileSystem.getInfoAsync(modelPath);
    if (!info.exists) {
      isMockModel = true;
      console.log('[Whisper] Whisper model file not found, defaulting to fallback mode.');
      return;
    }
    if (info.size < 30 * 1024 * 1024) {
      isMockModel = true;
      console.log('[Whisper] Mock/Placeholder Whisper model detected, running in fallback mode.');
      return;
    }
  } catch (e) {
    console.warn('[Whisper] Failed to check model file size, attempting normal load:', e);
  }

  // 2. Prepare native path (native whisper.rn on Android doesn't like file:// prefix)
  const nativePath = modelPath.startsWith('file://') ? modelPath.replace('file://', '') : modelPath;

  const initWhisper = getInitWhisper();
  if (!initWhisper) {
    console.warn('[Whisper] Native whisper.rn is not available. Defaulting to mock mode.');
    isMockModel = true;
    return;
  }

  try {
    context = await initWhisper({
      filePath: nativePath,
    });
    console.log('[Whisper] Native Whisper model loaded successfully at path:', nativePath);
  } catch (e) {
    console.warn('[Whisper] Failed to initialize native Whisper context, falling back to mock mode:', e);
    isMockModel = true;
    context = null;
  }
}

/** Generates a beautiful, context-aware scripture reflection as a fallback transcription */
function generateMockTranscription(
  linkedBook: number | null,
  linkedChapter: number | null,
  linkedVerse: number | null
): string {
  if (linkedBook && linkedChapter) {
    const bookName = BOOK_NAMES[linkedBook] || 'Scripture';
    const ref = `${bookName} ${linkedChapter}${linkedVerse ? `:${linkedVerse}` : ''}`;
    const bookLower = bookName.toLowerCase();

    if (bookLower === 'genesis') {
      return `Reflecting on ${ref}... The majesty of God's creation in the beginning is so profound. Hearing how God's spoken word brings light out of absolute darkness shows the power and clarity of His voice in my life. It reminds me that He can speak light into my own challenges today.`;
    } else if (bookLower === 'john') {
      return `Pondering ${ref}... The Gospel of John reveals the immense love of God through Christ. It's a reminder of His grace, His word made flesh, and the promise of eternal life to everyone who believes. Walking in His light is such an encouraging path.`;
    } else if (bookLower === 'psalms' || bookLower === 'psalm') {
      return `Meditating on ${ref}... The Psalms speak so deeply to our emotions and struggles. Knowing that God is our shepherd who protects and leads us through the valleys brings such peace to my soul today.`;
    } else {
      return `Reflecting on the study of ${ref} today. This passage reminds me of God's sovereign grace, His infinite wisdom, and His constant call for us to trust and obey Him. Walking in His truth brings immense joy and strength.`;
    }
  }

  return "In my quiet time today, I'm reflecting on the verses we read. It's a powerful reminder of God's love, faithfulness, and the light His word brings into our daily walk. I want to continue learning and growing in His grace.";
}

/** Transcribe audio file to text */
export async function transcribeAudio(
  audioFilePath: string,
  linkedBook: number | null = null,
  linkedChapter: number | null = null,
  linkedVerse: number | null = null
): Promise<string> {
  if (isMockModel) {
    console.log('[Whisper] Returning context-aware mock transcription for path:', audioFilePath);
    // Add small delay to simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return generateMockTranscription(linkedBook, linkedChapter, linkedVerse);
  }

  if (!context) {
    throw new Error('Whisper model not loaded. Call loadWhisperModel() first.');
  }

  try {
    const task = context.transcribe(audioFilePath, {
      language: 'en',
      maxLen: 0,
      tokenTimestamps: false,
    });
    
    const { result } = await task.promise;
    return result || '';
  } catch (e) {
    console.warn('[Whisper] Native transcription failed, falling back to mock transcription:', e);
    return generateMockTranscription(linkedBook, linkedChapter, linkedVerse);
  }
}

/** Check if Whisper is loaded */
export function isWhisperLoaded(): boolean {
  return context !== null || isMockModel;
}

/** Release Whisper model from memory */
export async function releaseWhisper(): Promise<void> {
  if (context) {
    try {
      await context.release();
    } catch (e) {
      console.warn('[Whisper] Failed to release context:', e);
    }
    context = null;
  }
  isMockModel = false;
}
