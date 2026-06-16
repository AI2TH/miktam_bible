import { Share } from 'react-native';

/** Shares verse text with standard OS share sheet dialogs */
export async function shareVerse(
  bookName: string,
  chapter: number,
  verseNumber: number,
  text: string
): Promise<void> {
  try {
    await Share.share({
      message: `"${text}"\n\n— ${bookName} ${chapter}:${verseNumber}`,
    });
  } catch (e) {
    console.error('[Share] Failed to share verse text:', e);
  }
}
