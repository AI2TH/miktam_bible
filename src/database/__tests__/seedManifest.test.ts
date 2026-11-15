import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSeedChecksum, seedSourceCandidates } from '../seedManifest.ts';

test('release builds never read the seed from shared storage', () => {
  const release = seedSourceCandidates(false, 'file:///bundle/');
  assert.ok(release.every((uri) => !uri.includes('sdcard')));
  assert.equal(release[0], 'file:///bundle/bible.db');

  const dev = seedSourceCandidates(true, null);
  assert.equal(dev[0], 'file:///sdcard/Download/bible.db');
  assert.equal(new Set(dev).size, dev.length, 'no duplicate candidates');
});

test('seed checksum: matches, mismatches and an unset manifest', () => {
  assert.equal(checkSeedChecksum('ABCDEF', 'abcdef'), 'ok');
  assert.equal(checkSeedChecksum('abcdef', '123456'), 'mismatch');
  assert.equal(checkSeedChecksum(undefined, '123456'), 'mismatch');
  assert.equal(checkSeedChecksum('abcdef', null), 'unchecked');
});
