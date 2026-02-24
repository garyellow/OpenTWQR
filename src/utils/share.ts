import type { ShareData, ShareOptions, ParseShareResult } from '../types';
import { isValidAccount } from './twqr';

/* ------------------------------------------------------------------ */
/*  Base64url helpers                                                  */
/* ------------------------------------------------------------------ */

const toBase64Url = (buf: Uint8Array): string => {
  let binary = '';
  for (const b of buf) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (str: string): Uint8Array => {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/* ------------------------------------------------------------------ */
/*  Crypto primitives (Web Crypto API)                                 */
/* ------------------------------------------------------------------ */

const PBKDF2_ITERATIONS = 600_000;
const VERSION = 0x01;
const IV_LEN = 12;
const SALT_LEN = 16;
const KEY_LEN = 32;

/** Extract a properly-typed ArrayBuffer from a Uint8Array (fixes TS 5.7+ BufferSource compat). */
const asBuffer = (data: Uint8Array): ArrayBuffer => {
  const { buffer, byteOffset, byteLength } = data;
  if (byteOffset === 0 && byteLength === buffer.byteLength) return buffer as ArrayBuffer;
  return (buffer as ArrayBuffer).slice(byteOffset, byteOffset + byteLength);
};

const deriveKeyFromPassword = async (
  password: string,
  salt: Uint8Array,
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

const aesEncrypt = async (
  key: CryptoKey,
  iv: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> => {
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: asBuffer(iv) }, key, asBuffer(plaintext));
  return new Uint8Array(ct);
};

const aesDecrypt = async (
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array | null> => {
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: asBuffer(iv) }, key, asBuffer(ciphertext));
    return new Uint8Array(pt);
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ */
/*  Build share URL                                                    */
/* ------------------------------------------------------------------ */
/*  URL format:                                                        */
/*    https://domain/s/{path_b64}#{fragment_b64}                       */
/*                                                                     */
/*  path binary:                                                       */
/*    [version:1][flags:1][iv:12][salt?:16][ciphertext+tag]            */
/*    flags bit0 = hasPassword                                         */
/*                                                                     */
/*  fragment binary:                                                   */
/*    no password  → [rawKey:32]                                       */
/*    has password → [iv2:12][encryptedKey+tag:48]                     */
/* ------------------------------------------------------------------ */

export const buildShareUrl = async (
  data: ShareData,
  options: ShareOptions,
): Promise<string> => {
  const payload: Record<string, string | number> = {
    b: data.bankCode,
    a: data.accountNumber,
  };
  if (data.amount != null && data.amount > 0) payload.m = data.amount;
  if (data.note) payload.n = data.note;
  if (options.expiry > 0) {
    payload.exp = Math.floor(Date.now() / 1000) + options.expiry;
  }

  const json = new TextEncoder().encode(JSON.stringify(payload));
  const hasPassword = options.password.length > 0;

  // Generate random AES-256 key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key));

  // Encrypt payload
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const ciphertext = await aesEncrypt(key, iv, json);

  const flags = hasPassword ? 0x01 : 0x00;
  let pathBytes: Uint8Array;
  let fragmentBytes: Uint8Array;

  if (hasPassword) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const pwdKey = await deriveKeyFromPassword(options.password, salt);
    const iv2 = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const encryptedKey = await aesEncrypt(pwdKey, iv2, rawKey);

    pathBytes = new Uint8Array(2 + IV_LEN + SALT_LEN + ciphertext.length);
    pathBytes[0] = VERSION;
    pathBytes[1] = flags;
    pathBytes.set(iv, 2);
    pathBytes.set(salt, 2 + IV_LEN);
    pathBytes.set(ciphertext, 2 + IV_LEN + SALT_LEN);

    fragmentBytes = new Uint8Array(IV_LEN + encryptedKey.length);
    fragmentBytes.set(iv2, 0);
    fragmentBytes.set(encryptedKey, IV_LEN);
  } else {
    pathBytes = new Uint8Array(2 + IV_LEN + ciphertext.length);
    pathBytes[0] = VERSION;
    pathBytes[1] = flags;
    pathBytes.set(iv, 2);
    pathBytes.set(ciphertext, 2 + IV_LEN);

    fragmentBytes = rawKey;
  }

  const origin = window.location.origin;
  return `${origin}/s/${toBase64Url(pathBytes)}#${toBase64Url(fragmentBytes)}`;
};

/* ------------------------------------------------------------------ */
/*  Parse share URL                                                    */
/* ------------------------------------------------------------------ */

export const parseShareUrl = async (
  pathData: string,
  fragment: string,
  password?: string,
): Promise<ParseShareResult> => {
  try {
    if (!pathData || !fragment) return { status: 'invalid' };

    const pathBytes = fromBase64Url(pathData);
    if (pathBytes.length < 2 || pathBytes[0] !== VERSION) return { status: 'invalid' };

    const flags = pathBytes[1];
    const hasPassword = (flags & 0x01) !== 0;
    const iv = pathBytes.slice(2, 2 + IV_LEN);

    let ciphertext: Uint8Array;
    let rawKey: Uint8Array;

    if (hasPassword) {
      if (pathBytes.length < 2 + IV_LEN + SALT_LEN + 1) return { status: 'invalid' };
      const salt = pathBytes.slice(2 + IV_LEN, 2 + IV_LEN + SALT_LEN);
      ciphertext = pathBytes.slice(2 + IV_LEN + SALT_LEN);

      const fragBytes = fromBase64Url(fragment);
      if (fragBytes.length < IV_LEN + 1) return { status: 'invalid' };
      const iv2 = fragBytes.slice(0, IV_LEN);
      const encryptedKey = fragBytes.slice(IV_LEN);

      if (password == null) return { status: 'need-password' };

      const pwdKey = await deriveKeyFromPassword(password, salt);
      const decryptedKey = await aesDecrypt(pwdKey, iv2, encryptedKey);
      if (!decryptedKey) return { status: 'wrong-password' };
      rawKey = decryptedKey;
    } else {
      ciphertext = pathBytes.slice(2 + IV_LEN);
      rawKey = fromBase64Url(fragment);
    }

    if (rawKey.length !== KEY_LEN) return { status: 'invalid' };

    const key = await crypto.subtle.importKey(
      'raw',
      asBuffer(rawKey),
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    );
    const plaintext = await aesDecrypt(key, iv, ciphertext);
    if (!plaintext) return { status: 'invalid' };

    const parsed = JSON.parse(new TextDecoder().decode(plaintext));
    if (typeof parsed.b !== 'string' || typeof parsed.a !== 'string' || !isValidAccount(parsed.a)) {
      return { status: 'invalid' };
    }

    // Check expiry
    if (typeof parsed.exp === 'number' && parsed.exp > 0) {
      if (Math.floor(Date.now() / 1000) > parsed.exp) {
        return { status: 'expired' };
      }
    }

    return {
      status: 'ok',
      data: {
        bankCode: parsed.b,
        accountNumber: parsed.a,
        amount: typeof parsed.m === 'number' ? parsed.m : undefined,
        note: typeof parsed.n === 'string' ? parsed.n : undefined,
      },
    };
  } catch {
    return { status: 'invalid' };
  }
};
