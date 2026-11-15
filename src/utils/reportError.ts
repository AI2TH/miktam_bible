import { Alert, Platform, ToastAndroid } from 'react-native';

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Log an error from a UI action and tell the user it failed: a toast on
 * Android, an alert on iOS (React Native has no built-in iOS toast).
 */
export function reportError(context: string, error: unknown, message: string = DEFAULT_MESSAGE): void {
  console.error(`[${context}]`, error);
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('Error', message);
  }
}

/**
 * Wrap an async UI handler so a rejection is reported instead of becoming an
 * unhandled promise rejection that the user never sees.
 */
export function guarded<A extends unknown[]>(
  context: string,
  handler: (...args: A) => Promise<unknown>,
  message?: string
): (...args: A) => Promise<void> {
  return async (...args: A) => {
    try {
      await handler(...args);
    } catch (e) {
      reportError(context, e, message);
    }
  };
}
