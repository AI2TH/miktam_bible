import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLatestRequest } from '../latestRequest.ts';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('a slow earlier lookup cannot overwrite a newer one', async () => {
  const tracker = createLatestRequest();
  let shown = '';
  const lookup = async (value: string, ms: number) => {
    const id = tracker.begin();
    await delay(ms);
    if (tracker.isLatest(id)) shown = value;
  };
  await Promise.all([lookup('G26 (slow, first)', 30), lookup('H430 (fast, second)', 5)]);
  assert.equal(shown, 'H430 (fast, second)');
});

test('cancel invalidates requests in flight', async () => {
  const tracker = createLatestRequest();
  const id = tracker.begin();
  tracker.cancel();
  assert.equal(tracker.isLatest(id), false);
  assert.equal(tracker.isLatest(tracker.begin()), true);
});
