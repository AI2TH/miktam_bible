import type { WhisperContext } from 'whisper.rn';
import * as FileSystem from 'expo-file-system/legacy';

let context: WhisperContext | null = null;
let loadedPath: string | null = null;
let initWhisperFn: any = null;

/** Files smaller than this cannot be a usable Whisper model (truncated or placeholder download). */
const MIN_MODEL_BYTES = 30 * 1024 * 1024;

function getInitWhisper() {
  if (initWhisperFn) return initWhisperFn;
  try {
    const whisperModule = require('whisper.rn');
    initWhisperFn = whisperModule.initWhisper;
    return initWhisperFn;
  } catch (e) {
    console.warn('[Whisper] Failed to load RNWhisper native module:', e);
    return null;
  }
}

/**
 * Load the Whisper model from path.
 * Returns true when a real model is loaded, false when no usable model is available.
 * There is no fallback: without a model, nothing is transcribed.
 */
export async function loadWhisperModel(modelPath: string): Promise<boolean> {
  // Dynamically resolve package-agnostic path under the current app's document directory
  let actualPath = modelPath;
  if (modelPath && modelPath.includes('/files/models/')) {
    const filename = modelPath.substring(modelPath.lastIndexOf('/') + 1);
    actualPath = `${FileSystem.documentDirectory}models/${filename}`;
  }

  if (context && loadedPath === actualPath) {
    return true;
  }

  await releaseWhisper();

  if (!actualPath) {
    return false;
  }

  try {
    const info = await FileSystem.getInfoAsync(actualPath);
    if (!info.exists) {
      if (__DEV__) console.log('[Whisper] Whisper model file not found:', actualPath);
      return false;
    }
    if (info.size < MIN_MODEL_BYTES) {
      console.warn('[Whisper] Whisper model file is too small to be valid; ignoring it');
      return false;
    }
  } catch (e) {
    console.warn('[Whisper] Failed to check model file size, attempting normal load:', e);
  }

  // Native whisper.rn on Android doesn't like the file:// prefix
  const nativePath = actualPath.startsWith('file://') ? actualPath.replace('file://', '') : actualPath;

  const initWhisper = getInitWhisper();
  if (!initWhisper) {
    console.warn('[Whisper] Native whisper.rn is not available.');
    return false;
  }

  try {
    context = await initWhisper({
      filePath: nativePath,
    });
    loadedPath = actualPath;
    if (__DEV__) console.log('[Whisper] Native Whisper model loaded at path:', nativePath);
    return true;
  } catch (e) {
    console.warn('[Whisper] Failed to initialize native Whisper context:', e);
    context = null;
    loadedPath = null;
    return false;
  }
}

/**
 * Transcribe an audio file to text.
 * Throws if no model is loaded or transcription fails; it never invents a transcript.
 */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
  if (!context) {
    throw new Error('Whisper model not loaded. Call loadWhisperModel() first.');
  }

  const nativeAudioPath = audioFilePath.startsWith('file://')
    ? audioFilePath.replace('file://', '')
    : audioFilePath;

  const task = context.transcribe(nativeAudioPath, {
    language: 'en',
    maxLen: 0,
    tokenTimestamps: false,
  });

  const { result } = await task.promise;
  return result || '';
}

/** Check if a real Whisper model is loaded */
export function isWhisperLoaded(): boolean {
  return context !== null;
}

/** Release Whisper model from memory */
export async function releaseWhisper(): Promise<void> {
  if (context) {
    try {
      await context.release();
    } catch (e) {
      console.warn('[Whisper] Failed to release context:', e);
    }
  }
  context = null;
  loadedPath = null;
}
