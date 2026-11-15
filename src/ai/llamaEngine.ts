import { initLlama, type LlamaContext } from 'llama.rn';
import * as FileSystem from 'expo-file-system/legacy';

let context: LlamaContext | null = null;
let loadedPath: string | null = null;

/** Files smaller than this cannot be a usable GGUF model (truncated or placeholder download). */
const MIN_MODEL_BYTES = 50 * 1024 * 1024;

/**
 * Initialize the LLM engine with a GGUF model file.
 *
 * Returns true when a real model is loaded. Returns false when there is no
 * usable model file (none downloaded, missing, truncated, or llama.rn failed
 * to load it). There is no fallback "mock" model: callers must handle the
 * no-model case explicitly and never present anything else as a model answer.
 */
export async function loadModel(modelPath: string): Promise<boolean> {
  // Dynamically resolve package-agnostic path under the current app's document directory
  let actualPath = modelPath;
  if (modelPath && modelPath.includes('/files/models/')) {
    const filename = modelPath.substring(modelPath.lastIndexOf('/') + 1);
    actualPath = `${FileSystem.documentDirectory}models/${filename}`;
  }

  if (context && loadedPath === actualPath) {
    return true;
  }

  await releaseModel();

  if (!actualPath) {
    if (__DEV__) console.log('[LLM] No model downloaded');
    return false;
  }

  try {
    const info = await FileSystem.getInfoAsync(actualPath);
    if (!info.exists) {
      if (__DEV__) console.log('[LLM] Model file not found:', actualPath);
      return false;
    }
    if (info.size < MIN_MODEL_BYTES) {
      console.warn('[LLM] Model file is too small to be a valid GGUF model; ignoring it');
      return false;
    }
  } catch (e) {
    console.warn('[LLM] Failed to check model file size, attempting normal load:', e);
  }

  const nativePath = actualPath.startsWith('file://') ? actualPath.replace('file://', '') : actualPath;

  try {
    context = await initLlama({
      model: nativePath,
      n_ctx: 2048,        // Mobile-safe context window
      n_batch: 256,       // Mobile-safe batch size
      n_threads: 4,       // CPU threads for inference
      n_gpu_layers: 0,    // 0 = CPU only
      use_mlock: false,
      use_mmap: true,     // Memory-map the model file
    });
    loadedPath = actualPath;
    if (__DEV__) console.log('[LLM] Native model loaded at path:', nativePath);
    return true;
  } catch (e) {
    console.warn('[LLM] Failed to initialize native Llama context:', e);
    context = null;
    loadedPath = null;
    return false;
  }
}

/**
 * Generate a response from the loaded LLM.
 * Streams tokens via callback for real-time display.
 * Throws if no model is loaded or inference fails; it never invents an answer.
 *
 * @param prompt - Full prompt including system message + context + user query
 * @param onToken - Called for each generated token
 * @returns Full generated text
 */
export async function generateResponse(
  prompt: string,
  onToken?: (token: string) => void,
  maxTokens: number = 512
): Promise<string> {
  if (!context) throw new Error('LLM not loaded. Call loadModel() first.');

  const result = await context.completion(
    {
      prompt,
      n_predict: maxTokens,
      temperature: 0.7,
      top_k: 40,
      top_p: 0.9,
      penalty_repeat: 1.1,
      stop: ['### Question:', '### Question', '\nContext:', '<|im_end|>', '<|endoftext|>'],
    },
    (data) => {
      if (data.token) {
        onToken?.(data.token);
      }
    }
  );
  return result.text;
}

/** Check if a real model is currently loaded */
export function isModelLoaded(): boolean {
  return context !== null;
}

/** Release the model from memory */
export async function releaseModel(): Promise<void> {
  if (context) {
    try {
      await context.release();
    } catch (e) {
      console.warn('[LLM] Failed to release context:', e);
    }
  }
  context = null;
  loadedPath = null;
}
