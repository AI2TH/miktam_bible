/**
 * Tracks the latest request of one kind, so a slow earlier response cannot
 * overwrite a newer one. No React or Expo imports, so it can be unit tested.
 */
export interface LatestRequest {
  /** Start a request; returns its id. */
  begin(): number;
  /** Whether `id` is still the most recent request. */
  isLatest(id: number): boolean;
  /** Invalidate every request in flight (e.g. on unmount). */
  cancel(): void;
}

export function createLatestRequest(): LatestRequest {
  let current = 0;
  return {
    begin: () => ++current,
    isLatest: (id) => id === current,
    cancel: () => {
      current += 1;
    },
  };
}
