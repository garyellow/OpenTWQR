import type { ShareData } from '../types';

/**
 * Encode share data into a base64url string.
 * Compact JSON payload keys: b=bankCode, a=accountNumber, m=amount, n=note
 */
const encodeShareData = (data: ShareData): string => {
  const payload: Record<string, string | number> = {
    b: data.bankCode,
    a: data.accountNumber,
  };

  if (data.amount != null && data.amount > 0) {
    payload.m = data.amount;
  }

  if (data.note) {
    payload.n = data.note;
  }

  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Build a share URL for the given data.
 * Format: https://domain/s/BASE64URL_DATA
 */
export const buildShareUrl = (data: ShareData): string => {
  const encoded = encodeShareData(data);
  const origin = window.location.origin;
  return `${origin}/s/${encoded}`;
};

/**
 * Parse a base64url-encoded share data string.
 * Returns null if the data is empty or invalid.
 */
export const parseShareData = (raw: string): ShareData | null => {
  if (!raw) return null;

  try {
    const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(escape(atob(`${base64}${padding}`)));
    const parsed = JSON.parse(json);

    if (typeof parsed.b !== 'string' || typeof parsed.a !== 'string') {
      return null;
    }

    return {
      bankCode: parsed.b,
      accountNumber: parsed.a,
      amount: typeof parsed.m === 'number' ? parsed.m : undefined,
      note: typeof parsed.n === 'string' ? parsed.n : undefined,
    };
  } catch {
    return null;
  }
};
