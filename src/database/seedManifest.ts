/**
 * The bundled seed database (android/app/src/main/assets/bible.db, bundled on iOS
 * through metro's 'db' asset extension). Bump `version` whenever a new seed ships;
 * that replaces bible.db on devices (user data is kept in user.db).
 *
 * `md5` is the checksum of the seed file. Regenerate it with
 *   node scripts/write-seed-manifest.js
 * after replacing the asset. While it is null the copy is accepted unchecked
 * (with a warning), because the asset is not in this repository.
 */
export const SEED_DB = {
  version: '1.1.0',
  md5: null as string | null,
  /** Smallest plausible size of the seed (the KJV seed is ~650 MB). */
  minSize: 50 * 1024 * 1024,
};

export type SeedChecksumResult = 'ok' | 'mismatch' | 'unchecked';

/** Compare the md5 of a copied seed with the manifest. */
export function checkSeedChecksum(actual: string | null | undefined, expected: string | null): SeedChecksumResult {
  if (!expected) return 'unchecked';
  if (!actual) return 'mismatch';
  return actual.toLowerCase() === expected.toLowerCase() ? 'ok' : 'mismatch';
}

/**
 * Where the seed may be copied from. Shared storage (/sdcard) is readable and
 * writable by other apps, so it is only a source in development builds.
 */
export function seedSourceCandidates(isDev: boolean, bundleDirectory: string | null): string[] {
  const devOnly = isDev ? ['file:///sdcard/Download/bible.db', 'file:///sdcard/bible.db'] : [];
  return [
    ...devOnly,
    `${bundleDirectory || 'asset:/'}bible.db`,
    'asset:/bible.db',
    'asset:///bible.db',
  ].filter((uri, i, all) => all.indexOf(uri) === i);
}
