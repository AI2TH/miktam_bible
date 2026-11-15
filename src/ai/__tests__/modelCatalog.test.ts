import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isListedModel, renamedModelFile, VERIFIED_MODEL_DOWNLOADS, LLM_MODEL_ID } from '../modelCatalog.ts';

test('the 135M model file saved under the old id is renamed', () => {
  assert.equal(renamedModelFile('bibleslm-0.5b-q4.gguf'), `${LLM_MODEL_ID}.gguf`);
  assert.equal(renamedModelFile(`${LLM_MODEL_ID}.gguf`), null);
  assert.equal(renamedModelFile('ggml-base.en.bin'), null);
});

test('only models with a verified URL are offered, unless already downloaded', () => {
  const llm = VERIFIED_MODEL_DOWNLOADS[LLM_MODEL_ID];
  assert.equal(isListedModel({ id: LLM_MODEL_ID, download_url: llm.url, is_downloaded: 0 }), true);
  assert.equal(isListedModel({ id: 'bibleslm-1.5b-q4', download_url: 'https://example.invalid/x.gguf', is_downloaded: 0 }), false);
  assert.equal(isListedModel({ id: LLM_MODEL_ID, download_url: 'https://example.invalid/changed.gguf', is_downloaded: 0 }), false);
  assert.equal(isListedModel({ id: 'custom', download_url: 'https://example.invalid/x.gguf', is_downloaded: 1 }), true);
});
