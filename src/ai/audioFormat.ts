/**
 * whisper.rn reads audio files as 16 kHz mono 16-bit PCM WAV. On Android it
 * skips a 44-byte header and treats the rest as samples, so an AAC .m4a (what
 * expo-audio records on Android; MediaRecorder cannot write WAV) is turned
 * into noise rather than rejected. Check the header before transcribing.
 * No Expo imports, so it can be unit tested.
 */

export const WHISPER_SAMPLE_RATE = 16000;

export type WavCheck = { ok: true } | { ok: false; reason: string };

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decode base64 (as returned by expo-file-system) without relying on atob. */
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i + 1 < clean.length; i += 4) {
    const a = B64.indexOf(clean[i]);
    const b = B64.indexOf(clean[i + 1]);
    const c = i + 2 < clean.length ? B64.indexOf(clean[i + 2]) : 0;
    const d = i + 3 < clean.length ? B64.indexOf(clean[i + 3]) : 0;
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    if (o < out.length) out[o++] = (n >> 16) & 0xff;
    if (i + 2 < clean.length && o < out.length) out[o++] = (n >> 8) & 0xff;
    if (i + 3 < clean.length && o < out.length) out[o++] = n & 0xff;
  }
  return out.subarray(0, o);
}

const ascii = (b: Uint8Array, at: number) => String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3]);
const u16 = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8);
const u32 = (b: Uint8Array, at: number) => (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;

/** Check the first bytes of a file (a few KB is enough) for 16 kHz mono 16-bit PCM WAV. */
export function checkWhisperWav(head: Uint8Array): WavCheck {
  if (head.length < 12 || ascii(head, 0) !== 'RIFF' || ascii(head, 8) !== 'WAVE') {
    const isMp4 = head.length >= 8 && ascii(head, 4) === 'ftyp';
    return {
      ok: false,
      reason: isMp4
        ? 'This recording is AAC (.m4a). On-device transcription needs a 16 kHz mono WAV recording.'
        : 'This recording is not a WAV file. On-device transcription needs a 16 kHz mono WAV recording.',
    };
  }
  // Walk the chunks to find 'fmt ' (iOS may write a padding chunk first)
  let at = 12;
  while (at + 8 <= head.length) {
    const id = ascii(head, at);
    const size = u32(head, at + 4);
    if (id === 'fmt ') {
      if (at + 24 > head.length) break;
      const format = u16(head, at + 8);
      const channels = u16(head, at + 10);
      const rate = u32(head, at + 12);
      const bits = u16(head, at + 22);
      if (format !== 1 || channels !== 1 || rate !== WHISPER_SAMPLE_RATE || bits !== 16) {
        return {
          ok: false,
          reason: `This WAV is ${channels} channel(s), ${rate} Hz, ${bits}-bit (format ${format}); transcription needs 16 kHz mono 16-bit PCM.`,
        };
      }
      return { ok: true };
    }
    at += 8 + size + (size % 2);
  }
  return { ok: false, reason: 'The WAV header could not be read.' };
}
