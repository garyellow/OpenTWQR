/**
 * Safe localStorage wrapper — gracefully handles SecurityError
 * (private/incognito browsing) and QuotaExceededError.
 *
 * Used for non-sensitive, synchronous data like theme preferences
 * and install-prompt dismiss timestamps where IndexedDB (async) is
 * not suitable.
 */

export const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const safeRemoveItem = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};
