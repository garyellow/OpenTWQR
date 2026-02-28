/**
 * Backup encryption/decryption utilities for account data import/export.
 *
 * Uses AES-256-GCM with PBKDF2 key derivation (when password-protected).
 * Output is a compact, URL-safe string that can be copy-pasted.
 *
 * Format: `OTWQR1-{base64url_payload}`
 *
 * Binary payload layout:
 *   [version: 1 byte = 0x01]
 *   [flags:   1 byte]          — bit0 = hasPassword
 *
 *   If hasPassword (flags & 0x01):
 *     [salt:       16 bytes]   — PBKDF2 salt
 *     [iv:         12 bytes]   — AES-GCM nonce
 *     [ciphertext: variable]   — AES-GCM encrypted JSON (includes 16-byte auth tag)
 *
 *   If !hasPassword (flags = 0x00):
 *     [iv:         12 bytes]   — AES-GCM nonce
 *     [ciphertext: variable]   — AES-GCM encrypted JSON (includes 16-byte auth tag)
 *     [rawKey:     32 bytes]   — the AES key itself, appended for self-contained decoding
 */

import type { BankAccount } from '../types';
import {
  toBase64Url,
  fromBase64Url,
  deriveKeyFromPassword,
  IV_LEN,
  SALT_LEN,
  KEY_LEN,
} from './crypto';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PREFIX = 'OTWQR1-';
const VERSION = 0x01;

/* ------------------------------------------------------------------ */
/*  Backup data schema                                                 */
/* ------------------------------------------------------------------ */

interface BackupPayload {
  /** Schema version for future compatibility */
  v: 1;
  /** Exported accounts */
  accounts: BankAccount[];
  /** ISO timestamp of export */
  exportedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Export                                                              */
/* ------------------------------------------------------------------ */

export type ExportResult =
  | { ok: true; data: string }
  | { ok: false; error: string };

/**
 * Encrypt account data into a compact, copy-pasteable string.
 *
 * @param accounts  - Array of bank accounts to export
 * @param password  - Optional password; empty string means no password protection
 */
export const exportBackup = async (
  accounts: BankAccount[],
  password: string,
): Promise<ExportResult> => {
  try {
    const payload: BackupPayload = {
      v: 1,
      accounts,
      exportedAt: new Date().toISOString(),
    };

    const json = new TextEncoder().encode(JSON.stringify(payload));
    const hasPassword = password.length > 0;
    const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));

    let key: CryptoKey;
    let salt: Uint8Array<ArrayBuffer> | null = null;
    let rawKeyBytes: Uint8Array<ArrayBuffer> | null = null;

    if (hasPassword) {
      salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
      key = await deriveKeyFromPassword(password, salt);
    } else {
      // Generate random key; will be embedded in output for self-contained decoding
      const generatedKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt'],
      );
      rawKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', generatedKey));
      key = generatedKey;
    }

    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, json),
    );

    const flags = hasPassword ? 0x01 : 0x00;
    let binaryPayload: Uint8Array;

    if (hasPassword && salt) {
      // [version][flags][salt:16][iv:12][ciphertext+tag]
      binaryPayload = new Uint8Array(2 + SALT_LEN + IV_LEN + ciphertext.length);
      binaryPayload[0] = VERSION;
      binaryPayload[1] = flags;
      binaryPayload.set(salt, 2);
      binaryPayload.set(iv, 2 + SALT_LEN);
      binaryPayload.set(ciphertext, 2 + SALT_LEN + IV_LEN);
    } else {
      // [version][flags][iv:12][ciphertext+tag][rawKey:32]
      binaryPayload = new Uint8Array(2 + IV_LEN + ciphertext.length + KEY_LEN);
      binaryPayload[0] = VERSION;
      binaryPayload[1] = flags;
      binaryPayload.set(iv, 2);
      binaryPayload.set(ciphertext, 2 + IV_LEN);
      binaryPayload.set(rawKeyBytes!, 2 + IV_LEN + ciphertext.length);
    }

    return { ok: true, data: PREFIX + toBase64Url(binaryPayload) };
  } catch {
    return { ok: false, error: '匯出加密失敗' };
  }
};

/* ------------------------------------------------------------------ */
/*  Import                                                             */
/* ------------------------------------------------------------------ */

export type ImportResult =
  | { ok: true; accounts: BankAccount[] }
  | { ok: false; error: 'invalid' | 'need-password' | 'wrong-password' | 'decrypt-error' };

/**
 * Decrypt and parse a backup string.
 *
 * @param input     - The full backup string (including `OTWQR1-` prefix)
 * @param password  - Password for protected backups; omit for initial probe
 */
export const importBackup = async (
  input: string,
  password?: string,
): Promise<ImportResult> => {
  try {
    const trimmed = input.trim();
    if (!trimmed.startsWith(PREFIX)) {
      return { ok: false, error: 'invalid' };
    }

    const encoded = trimmed.slice(PREFIX.length);
    const bytes = fromBase64Url(encoded);

    if (bytes.length < 2 || bytes[0] !== VERSION) {
      return { ok: false, error: 'invalid' };
    }

    const flags = bytes[1];
    const hasPassword = (flags & 0x01) !== 0;

    let key: CryptoKey;
    let iv: Uint8Array<ArrayBuffer>;
    let ciphertext: Uint8Array<ArrayBuffer>;

    if (hasPassword) {
      // Need at least header + salt + iv + 1 byte ciphertext
      if (bytes.length < 2 + SALT_LEN + IV_LEN + 1) {
        return { ok: false, error: 'invalid' };
      }

      if (password == null) {
        return { ok: false, error: 'need-password' };
      }

      const salt = bytes.slice(2, 2 + SALT_LEN);
      iv = bytes.slice(2 + SALT_LEN, 2 + SALT_LEN + IV_LEN);
      ciphertext = bytes.slice(2 + SALT_LEN + IV_LEN);
      key = await deriveKeyFromPassword(password, salt);
    } else {
      // Need at least header + iv + 1 byte ciphertext + key
      if (bytes.length < 2 + IV_LEN + 1 + KEY_LEN) {
        return { ok: false, error: 'invalid' };
      }

      iv = bytes.slice(2, 2 + IV_LEN);
      const rawKey = bytes.slice(bytes.length - KEY_LEN);
      ciphertext = bytes.slice(2 + IV_LEN, bytes.length - KEY_LEN);

      key = await crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM' },
        false,
        ['decrypt'],
      );
    }

    let plaintext: ArrayBuffer;
    try {
      plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext,
      );
    } catch {
      return { ok: false, error: hasPassword ? 'wrong-password' : 'decrypt-error' };
    }

    const parsed: BackupPayload = JSON.parse(new TextDecoder().decode(plaintext));

    // Validate schema
    if (parsed.v !== 1 || !Array.isArray(parsed.accounts)) {
      return { ok: false, error: 'invalid' };
    }

    // Validate each account
    const validAccounts: BankAccount[] = [];
    for (const acc of parsed.accounts) {
      if (
        typeof acc.id === 'string' &&
        typeof acc.bankCode === 'string' &&
        typeof acc.accountNumber === 'string' &&
        /^\d{3}$/.test(acc.bankCode) &&
        /^\d{10,16}$/.test(acc.accountNumber)
      ) {
        validAccounts.push({
          id: acc.id,
          bankCode: acc.bankCode,
          accountNumber: acc.accountNumber,
          label: typeof acc.label === 'string' ? acc.label : undefined,
          iconUrl: typeof acc.iconUrl === 'string' ? acc.iconUrl : undefined,
        });
      }
    }

    if (validAccounts.length === 0) {
      return { ok: false, error: 'invalid' };
    }

    return { ok: true, accounts: validAccounts };
  } catch {
    return { ok: false, error: 'invalid' };
  }
};

/**
 * Quick check whether a backup string requires a password,
 * without attempting full decryption.
 */
export const isPasswordProtected = (input: string): boolean | null => {
  const trimmed = input.trim();
  if (!trimmed.startsWith(PREFIX)) return null;

  try {
    const encoded = trimmed.slice(PREFIX.length);
    const bytes = fromBase64Url(encoded);
    if (bytes.length < 2 || bytes[0] !== VERSION) return null;
    return (bytes[1] & 0x01) !== 0;
  } catch {
    return null;
  }
};
