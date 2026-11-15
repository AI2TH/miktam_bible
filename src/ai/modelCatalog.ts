/**
 * Which AI models the app offers, and id renames for models already on disk.
 * No Expo imports, so it can be unit tested.
 */

/** The SmolLM2 135M model shipped as 'bibleslm-0.5b-q4', which named a 0.5B model it is not. */
export const MODEL_ID_RENAMES: Record<string, string> = {
  'bibleslm-0.5b-q4': 'bible-smollm2-135m-q4',
};

export const LLM_MODEL_ID = 'bible-smollm2-135m-q4';

/**
 * Download URLs that were checked (HTTP 200 and the expected size) with
 * scripts/check-model-urls.js. A model whose URL is not here is not offered for
 * download; one already on disk is still listed so it can be used or deleted.
 */
export const VERIFIED_MODEL_DOWNLOADS: Record<string, { url: string; bytes: number; checked: string }> = {
  [LLM_MODEL_ID]: {
    url: 'https://huggingface.co/skalvinnathan/bible-smollm2/resolve/main/bible-q4km.gguf',
    bytes: 105453984,
    checked: '2026-11-15',
  },
  'whisper-base-en': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    bytes: 147964211,
    checked: '2026-11-15',
  },
};

/** Whether a model row should be shown: downloaded already, or its URL is verified. */
export function isListedModel(row: { id: string; download_url: string; is_downloaded?: number | boolean }): boolean {
  if (row.is_downloaded === 1 || row.is_downloaded === true) return true;
  return VERIFIED_MODEL_DOWNLOADS[row.id]?.url === row.download_url;
}

/** New file name for a model file saved under a renamed id, or null if unchanged. */
export function renamedModelFile(fileName: string): string | null {
  for (const [oldId, newId] of Object.entries(MODEL_ID_RENAMES)) {
    if (fileName.startsWith(oldId)) return newId + fileName.slice(oldId.length);
  }
  return null;
}
