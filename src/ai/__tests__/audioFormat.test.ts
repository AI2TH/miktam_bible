import { test } from 'node:test';
import assert from 'node:assert/strict';
import { base64ToBytes, checkWhisperWav } from '../audioFormat.ts';

function wavHeader(opts: { rate?: number; channels?: number; bits?: number; format?: number; padChunk?: boolean } = {}) {
  const { rate = 16000, channels = 1, bits = 16, format = 1, padChunk = false } = opts;
  const parts: Buffer[] = [Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE')];
  if (padChunk) {
    const pad = Buffer.alloc(8 + 6);
    pad.write('FLLR', 0);
    pad.writeUInt32LE(6, 4);
    parts.push(pad);
  }
  const fmt = Buffer.alloc(8 + 16);
  fmt.write('fmt ', 0);
  fmt.writeUInt32LE(16, 4);
  fmt.writeUInt16LE(format, 8);
  fmt.writeUInt16LE(channels, 10);
  fmt.writeUInt32LE(rate, 12);
  fmt.writeUInt32LE((rate * channels * bits) / 8, 16);
  fmt.writeUInt16LE((channels * bits) / 8, 20);
  fmt.writeUInt16LE(bits, 22);
  parts.push(fmt, Buffer.from('data'), Buffer.alloc(4));
  return new Uint8Array(Buffer.concat(parts));
}

test('16 kHz mono 16-bit PCM WAV is accepted, with or without a padding chunk', () => {
  assert.deepEqual(checkWhisperWav(wavHeader()), { ok: true });
  assert.deepEqual(checkWhisperWav(wavHeader({ padChunk: true })), { ok: true });
});

test('AAC .m4a (Android recordings) and wrong WAV formats are rejected with a reason', () => {
  const m4a = new Uint8Array(Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from('ftypM4A '), Buffer.alloc(20)]));
  const aac = checkWhisperWav(m4a);
  assert.equal(aac.ok, false);
  assert.match(!aac.ok ? aac.reason : '', /AAC/);
  assert.equal(checkWhisperWav(wavHeader({ rate: 44100 })).ok, false);
  assert.equal(checkWhisperWav(wavHeader({ channels: 2 })).ok, false);
  assert.equal(checkWhisperWav(wavHeader({ format: 3, bits: 32 })).ok, false);
  assert.equal(checkWhisperWav(new Uint8Array(4)).ok, false);
});

test('base64ToBytes matches Buffer decoding, padded or not', () => {
  for (const s of ['', 'R', 'RI', 'RIF', 'RIFF', 'RIFF$\u0000\u0001WAVEfmt ']) {
    const b64 = Buffer.from(s, 'latin1').toString('base64');
    assert.deepEqual([...base64ToBytes(b64)], [...Buffer.from(s, 'latin1')]);
    assert.deepEqual([...base64ToBytes(b64.replace(/=+$/, ''))], [...Buffer.from(s, 'latin1')]);
  }
  const bytes = wavHeader();
  assert.deepEqual([...base64ToBytes(Buffer.from(bytes).toString('base64'))], [...bytes]);
});
