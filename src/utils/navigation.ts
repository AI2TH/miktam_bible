import { router, type Href } from 'expo-router';

/**
 * Open a chapter in the Read tab from a screen stacked over the tabs (the
 * bookmarks, studies and chat modals, the concordance cards). router.replace
 * there swapped the modal for a second copy of (tabs) on the root stack, so
 * back led to a duplicate. Close the overlays first, then navigate inside the
 * existing tabs.
 */
export function openChapterFromOverlay(bookNumber: number, chapter: number): void {
  if (router.canDismiss()) {
    router.dismissAll();
  }
  router.navigate({
    pathname: '/(tabs)/read/[book]/[chapter]',
    params: { book: bookNumber.toString(), chapter: chapter.toString() },
  });
}

/** Go back if there is history; otherwise navigate to `fallback` (deep links). */
export function goBackOr(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.navigate(fallback);
  }
}
