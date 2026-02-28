/**
 * Shared cryptographic primitives and encoding helpers.
 *
 * Used by both `backup.ts` (account import/export) and `share.ts`
 * (encrypted share links) to avoid code duplication.
 */

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PBKDF2_ITERATIONS = 600_000;
export const IV_LEN = 12;
export const SALT_LEN = 16;
export const KEY_LEN = 32;

/* ------------------------------------------------------------------ */
/*  Base64url helpers                                                  */
/* ------------------------------------------------------------------ */

export const toBase64Url = (buf: Uint8Array): string => {
  let binary = '';
  for (const b of buf) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const fromBase64Url = (str: string): Uint8Array<ArrayBuffer> => {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/* ------------------------------------------------------------------ */
/*  Crypto primitives                                                  */
/* ------------------------------------------------------------------ */

/** Extract a properly-typed ArrayBuffer from a Uint8Array (TS 5.7+ compat). */
export const asBuffer = (data: Uint8Array): ArrayBuffer => {
  const { buffer, byteOffset, byteLength } = data;
  if (byteOffset === 0 && byteLength === buffer.byteLength) return buffer as ArrayBuffer;
  return (buffer as ArrayBuffer).slice(byteOffset, byteOffset + byteLength);
};

export const deriveKeyFromPassword = async (
  password: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: asBuffer(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};
