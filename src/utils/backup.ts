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
 *
 * Payload JSON schema (v1 — flexible, category-based):
 *   {
 *     v: 1,
 *     accounts?: BankAccount[],      // present if user chose to include accounts
 *     style?: BackupStyle,           // accent colour + QR appearance
 *     preferences?: BackupPreferences, // theme mode + locale
 *     paymentLinks?: BankUrlConfig[], // payment app URL schemes
 *     exportedAt: string,
 *   }
 */

import type { BankAccount, QRDotStyle, QREyeStyle, QRErrorLevel } from '../types';
import type { QRLogoType } from '../stores/useQRSettingsStore';
import type { BankUrlConfig } from '../stores/useUrlSchemeStore';
import type { Locale } from '../stores/useLocaleStore';
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
/*  Backup data schemas                                                */
/* ------------------------------------------------------------------ */

/** Style snapshot — accent colour and QR appearance */
export interface BackupStyle {
  accentHue?: number;
  accentEnabled?: boolean;
  qr?: {
    logoType: QRLogoType;
    showAccount: boolean;
    showBankName: boolean;
    customName: string;
    dotStyle: QRDotStyle;
    eyeStyle: QREyeStyle;
    errorLevel: QRErrorLevel;
  };
}

/** Preferences snapshot — theme mode and locale */
export interface BackupPreferences {
  mode?: 'system' | 'light' | 'dark';
  locale?: Locale | null;
}

/** v1: flexible category-based backup — each section is optional */
interface BackupPayload {
  v: 1;
  accounts?: BankAccount[];
  style?: BackupStyle;
  preferences?: BackupPreferences;
  paymentLinks?: BankUrlConfig[];
  exportedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Export                                                              */
/* ------------------------------------------------------------------ */

/** What categories to include in the export */
export interface ExportOptions {
  accounts?: BankAccount[];
  style?: BackupStyle;
  preferences?: BackupPreferences;
  paymentLinks?: BankUrlConfig[];
}

export type ExportResult =
  | { ok: true; data: string }
  | { ok: false; error: 'encrypt-failed' | 'empty' };

/**
 * Encrypt selected categories into a compact, copy-pasteable string.
 *
 * @param options   - Categories to include (accounts, style, preferences, paymentLinks)
 * @param password  - Optional password; empty string means no password protection
 */
export const exportBackup = async (
  options: ExportOptions,
  password: string,
): Promise<ExportResult> => {
  try {
    const hasAccounts = options.accounts && options.accounts.length > 0;
    const hasStyle = options.style && Object.keys(options.style).length > 0;
    const hasPreferences = options.preferences && Object.keys(options.preferences).length > 0;
    const hasPaymentLinks = options.paymentLinks && options.paymentLinks.length > 0;

    if (!hasAccounts && !hasStyle && !hasPreferences && !hasPaymentLinks) {
      return { ok: false, error: 'empty' };
    }

    const payload: BackupPayload = {
      v: 1,
      ...(hasAccounts ? { accounts: options.accounts } : {}),
      ...(hasStyle ? { style: options.style } : {}),
      ...(hasPreferences ? { preferences: options.preferences } : {}),
      ...(hasPaymentLinks ? { paymentLinks: options.paymentLinks } : {}),
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
    return { ok: false, error: 'encrypt-failed' as const };
  }
};

/* ------------------------------------------------------------------ */
/*  Import                                                             */
/* ------------------------------------------------------------------ */

export type ImportResult =
  | { ok: true; accounts?: BankAccount[]; style?: BackupStyle; preferences?: BackupPreferences; paymentLinks?: BankUrlConfig[] }
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
    const hasPasswordFlag = (flags & 0x01) !== 0;

    let key: CryptoKey;
    let iv: Uint8Array<ArrayBuffer>;
    let ciphertext: Uint8Array<ArrayBuffer>;

    if (hasPasswordFlag) {
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
      return { ok: false, error: hasPasswordFlag ? 'wrong-password' : 'decrypt-error' };
    }

    const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as Record<string, unknown>;

    // Only accept v:1
    if (parsed.v !== 1) {
      return { ok: false, error: 'invalid' };
    }

    // Validate accounts if present (optional)
    let validAccounts: BankAccount[] | undefined;
    if (Array.isArray(parsed.accounts)) {
      const items: BankAccount[] = [];
      for (const acc of parsed.accounts) {
        if (
          acc && typeof acc === 'object' &&
          typeof (acc as Record<string, unknown>).id === 'string' &&
          typeof (acc as Record<string, unknown>).bankCode === 'string' &&
          typeof (acc as Record<string, unknown>).accountNumber === 'string' &&
          /^\d{3}$/.test((acc as Record<string, unknown>).bankCode as string) &&
          /^\d{10,16}$/.test((acc as Record<string, unknown>).accountNumber as string)
        ) {
          const a = acc as Record<string, unknown>;
          items.push({
            id: a.id as string,
            bankCode: a.bankCode as string,
            accountNumber: a.accountNumber as string,
            label: typeof a.label === 'string' ? a.label : undefined,
            iconUrl: typeof a.iconUrl === 'string' ? a.iconUrl : undefined,
          });
        }
      }
      if (items.length > 0) validAccounts = items;
    }

    // Validate style if present (optional)
    const validStyle = parsed.style ? validateStyle(parsed.style) : undefined;

    // Validate preferences if present (optional)
    const validPreferences = parsed.preferences ? validatePreferences(parsed.preferences) : undefined;

    // Validate paymentLinks if present (optional)
    const validPaymentLinks = parsed.paymentLinks ? validatePaymentLinks(parsed.paymentLinks) : undefined;

    // Must have at least one category
    if (!validAccounts && !validStyle && !validPreferences && !validPaymentLinks) {
      return { ok: false, error: 'invalid' };
    }

    return {
      ok: true,
      ...(validAccounts ? { accounts: validAccounts } : {}),
      ...(validStyle ? { style: validStyle } : {}),
      ...(validPreferences ? { preferences: validPreferences } : {}),
      ...(validPaymentLinks ? { paymentLinks: validPaymentLinks } : {}),
    };
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

/* ------------------------------------------------------------------ */
/*  Validation helpers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Validate and sanitise the style object from a v1 backup payload.
 * Returns a clean BackupStyle or undefined if nothing is valid.
 */
function validateStyle(raw: unknown): BackupStyle | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const s = raw as Record<string, unknown>;
  const result: BackupStyle = {};
  let hasAny = false;

  // Accent colour
  if (typeof s.accentHue === 'number' && typeof s.accentEnabled === 'boolean') {
    result.accentHue = s.accentHue;
    result.accentEnabled = s.accentEnabled;
    hasAny = true;
  } else if (typeof s.accentHue === 'number') {
    result.accentHue = s.accentHue;
    hasAny = true;
  } else if (typeof s.accentEnabled === 'boolean') {
    result.accentEnabled = s.accentEnabled;
    hasAny = true;
  }

  // QR settings
  if (s.qr && typeof s.qr === 'object') {
    const q = s.qr as Record<string, unknown>;
    const validLogoTypes = ['opentwqr', 'bank'];
    const validDotStyles = ['square', 'rounded', 'dots'];
    const validEyeStyles = ['square', 'rounded'];
    const validErrorLevels = ['L', 'M', 'Q', 'H'];

    if (
      validLogoTypes.includes(q.logoType as string) &&
      typeof q.showAccount === 'boolean' &&
      typeof q.showBankName === 'boolean' &&
      typeof q.customName === 'string' &&
      validDotStyles.includes(q.dotStyle as string) &&
      validEyeStyles.includes(q.eyeStyle as string) &&
      validErrorLevels.includes(q.errorLevel as string)
    ) {
      result.qr = {
        logoType: q.logoType as QRLogoType,
        showAccount: q.showAccount,
        showBankName: q.showBankName,
        customName: q.customName,
        dotStyle: q.dotStyle as QRDotStyle,
        eyeStyle: q.eyeStyle as QREyeStyle,
        errorLevel: q.errorLevel as QRErrorLevel,
      };
      hasAny = true;
    }
  }

  return hasAny ? result : undefined;
}

/**
 * Validate and sanitise the preferences object from a v1 backup payload.
 * Returns a clean BackupPreferences or undefined if nothing is valid.
 */
function validatePreferences(raw: unknown): BackupPreferences | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const s = raw as Record<string, unknown>;
  const result: BackupPreferences = {};
  let hasAny = false;

  // Theme mode
  if (s.mode === 'system' || s.mode === 'light' || s.mode === 'dark') {
    result.mode = s.mode;
    hasAny = true;
  }

  // Locale
  if (s.locale === null || s.locale === 'zh-TW' || s.locale === 'en-US') {
    result.locale = s.locale as Locale | null;
    hasAny = true;
  }

  return hasAny ? result : undefined;
}

/**
 * Validate and sanitise the paymentLinks array from a v1 backup payload.
 * Returns a clean array or undefined if empty/invalid.
 */
function validatePaymentLinks(raw: unknown): BankUrlConfig[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const validConfigs: BankUrlConfig[] = [];
  for (const c of raw) {
    if (
      c && typeof c === 'object' &&
      typeof (c as Record<string, unknown>).bankCode === 'string' &&
      typeof (c as Record<string, unknown>).urlTemplate === 'string' &&
      /^\d{3}$/.test((c as Record<string, unknown>).bankCode as string)
    ) {
      validConfigs.push({
        bankCode: (c as Record<string, unknown>).bankCode as string,
        urlTemplate: (c as Record<string, unknown>).urlTemplate as string,
      });
    }
  }
  return validConfigs.length > 0 ? validConfigs : undefined;
}
