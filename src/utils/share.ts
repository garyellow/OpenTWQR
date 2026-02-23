import type { ShareData } from '../types';

/**
 * Encode share data into a URL hash fragment.
 * Uses base64url encoding of a compact JSON payload.
 * Keys: b=bankCode, a=accountNumber, m=amount, n=note
 */
export const buildShareUrl = (data: ShareData): string => {
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
  const encoded = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const origin = window.location.origin;
  return `${origin}/#${encoded}`;
};

/**
 * Parse a share hash from the URL.
 * Returns null if the hash is empty or invalid.
 */
export const parseShareHash = (hash: string): ShareData | null => {
  const raw = hash.replace(/^#/, '');
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
