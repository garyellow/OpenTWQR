/**
 * URL Scheme / Universal Link / App Link utilities.
 *
 * Supported placeholder tokens in URL templates:
 *   - {account}        — raw account number
 *   - {paddedAccount}  — 16-char zero-padded account number
 *   - {bankCode}       — 3-digit bank code
 *   - {amount}         — amount in TWD (integer)
 *   - {amountCents}    — amount in cents (amount × 100)
 *   - {note}           — URL-encoded transaction note
 *
 * NOTE: Opening a bank URL requires a direct user gesture (tap on an <a> element).
 * Programmatic navigation via window.location.href from a timer / effect is blocked
 * by iOS for both custom URL schemes and HTTPS Universal Links.
 */

export interface UrlSchemeParams {
  bankCode: string;
  account: string;
  paddedAccount: string;
  amount: number;
  note?: string;
}

/**
 * Build a concrete URL from a user-defined template by replacing placeholders.
 */
export function buildBankUrl(template: string, params: UrlSchemeParams): string {
  return template
    .replace(/\{account\}/g, params.account)
    .replace(/\{paddedAccount\}/g, params.paddedAccount)
    .replace(/\{bankCode\}/g, params.bankCode)
    .replace(/\{amount\}/g, String(params.amount))
    .replace(/\{amountCents\}/g, String(params.amount * 100))
    .replace(/\{note\}/g, encodeURIComponent(params.note || ''));
}

/* ─── Android Intent Parsing ─────────────────────────────── */

/**
 * Typed extra entry for an Android Intent.
 *
 * Chrome intent:// uses single-letter prefixes:
 *   S → String, B → Boolean, i → integer, l → long, f → float, d → double
 */
export interface IntentExtra {
  type: 'S' | 'B' | 'i' | 'l' | 'f' | 'd';
  value: string;
}

/**
 * Structured representation of an Android Intent parsed from
 * Shortcut Maker's multi-line format or the serialized `#Intent;…;end` URI.
 */
export interface ParsedIntent {
  action?: string;
  packageName?: string;
  className?: string;
  /** Original Data URI from the intent, e.g. `ipassmoney://cpm/scanner_pay`. */
  dataUri?: string;
  extras?: Record<string, IntentExtra>;
}

/** Infer the Chrome intent type prefix from a raw value string. */
function inferExtraType(value: string): IntentExtra['type'] {
  if (value === 'true' || value === 'false') return 'B';
  return 'S';
}

/**
 * Known extra type prefixes used in Android's `Intent.toUri(URI_INTENT_SCHEME)`:
 *   S=String  B=Boolean  b=byte  c=char  d=double  f=float  i=int  l=long  s=short
 * We normalise to the subset Chrome actually supports.
 */
const EXTRA_TYPE_PREFIXES = new Set(['S', 'B', 'b', 'c', 'd', 'f', 'i', 'l', 's']);

/* ─── Multi-line format parser ───────────────────────────── */

/**
 * Parse the multi-line text format displayed in Shortcut Maker's "Inner Link"
 * list view (and similar apps like QuickShortcutMaker).
 *
 * Expected format:
 *   Action=android.intent.action.VIEW
 *   Package Name=com.example.app
 *   Class Name=com.example.app/com.example.app.SomeActivity
 *   Data=myapp://some/path
 *   Extras=>
 *   key1:value1
 *   key2:value2
 *
 * Returns `null` when the input cannot be parsed (no package name found).
 */
function parseMultiLineFormat(text: string): ParsedIntent | null {
  const result: ParsedIntent = {};
  const lines = text.trim().split(/\r?\n/);
  let inExtras = false;
  const extras: Record<string, IntentExtra> = {};

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (/^Action\s*=/i.test(line)) {
      result.action = line.replace(/^Action\s*=\s*/i, '').trim();
    } else if (/^Package\s*Name\s*=/i.test(line)) {
      result.packageName = line.replace(/^Package\s*Name\s*=\s*/i, '').trim();
    } else if (/^Class\s*Name\s*=/i.test(line)) {
      result.className = line.replace(/^Class\s*Name\s*=\s*/i, '').trim();
    } else if (/^Data\s*=/i.test(line)) {
      result.dataUri = line.replace(/^Data\s*=\s*/i, '').trim();
    } else if (/^Extras\s*=>/i.test(line)) {
      // Must match "Extras=>" specifically — the `=>` is required to avoid
      // false positives on keys like "ExtraShortcutEventName".
      inExtras = true;
    } else if (inExtras && line.includes(':')) {
      const idx = line.indexOf(':');
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key) extras[key] = { type: inferExtraType(value), value };
    }
  }

  if (Object.keys(extras).length > 0) {
    result.extras = extras;
  }

  return result.packageName ? result : null;
}

/* ─── Intent URI format parser ───────────────────────────── */

/**
 * Parse the serialized Intent URI format from Android's
 * `Intent.toUri(URI_INTENT_SCHEME)` or the "Edit Intent" screen in Shortcut Maker.
 *
 * Handles both:
 *   intent://HOST/path#Intent;action=…;scheme=…;component=…;S.key=val;end
 *   #Intent;action=…;component=…;S.key=val;end
 */
function parseIntentUri(text: string): ParsedIntent | null {
  const trimmed = text.trim();

  // Extract the fragment after `#Intent;`
  const marker = '#Intent;';
  const idx = trimmed.indexOf(marker);
  if (idx === -1) return null;

  // Extract host/path portion before `#Intent;` (from `intent://HOST/path`)
  let uriPath = '';
  if (idx > 0) {
    const beforeFragment = trimmed.slice(0, idx);
    const match = beforeFragment.match(/^intent:\/\/(.*)/i);
    if (match) uriPath = match[1];
  }

  const fragment = trimmed.slice(idx + marker.length);
  // Remove trailing `;end` or `end`
  const body = fragment.replace(/;?\s*end\s*$/, '');

  const result: ParsedIntent = {};
  const extras: Record<string, IntentExtra> = {};
  let scheme = '';

  for (const part of body.split(';')) {
    if (!part) continue;

    // Standard key=value fields
    if (part.startsWith('action=')) {
      result.action = part.slice(7);
    } else if (part.startsWith('package=')) {
      result.packageName = part.slice(8);
    } else if (part.startsWith('component=')) {
      result.className = part.slice(10);
    } else if (part.startsWith('category=')) {
      // Silently skip categories — we don't need them for building intent URLs
    } else if (part.startsWith('scheme=')) {
      scheme = part.slice(7);
    } else if (part.startsWith('type=') || part.startsWith('launchFlags=')) {
      // Skip other metadata fields
    } else {
      // Check for typed extra: e.g. `S.key=value`, `B.flag=true`, `i.count=5`
      const dotIdx = part.indexOf('.');
      if (dotIdx === 1 || dotIdx === 0) {
        // Single-char prefix before dot → typed extra
        const prefix = part.charAt(0);
        if (EXTRA_TYPE_PREFIXES.has(prefix)) {
          const rest = part.slice(dotIdx + 1);
          const eqIdx = rest.indexOf('=');
          if (eqIdx > 0) {
            const key = rest.slice(0, eqIdx);
            const value = rest.slice(eqIdx + 1);
            const type = (prefix === 'S' || prefix === 'B' || prefix === 'i' ||
                          prefix === 'l' || prefix === 'f' || prefix === 'd')
              ? prefix : 'S';
            extras[key] = { type, value };
          }
        }
      }
    }
  }

  if (Object.keys(extras).length > 0) {
    result.extras = extras;
  }

  // Reconstruct the original Data URI from scheme + path if present
  if (scheme && uriPath) {
    result.dataUri = `${scheme}://${uriPath}`;
  } else if (scheme) {
    result.dataUri = `${scheme}://`;
  }

  // Infer packageName from component if not explicitly provided
  // e.g. component=com.jkos.app/com.jkos.app.DeepLinkRecognizeActivity → package com.jkos.app
  if (!result.packageName && result.className) {
    const slashIdx = result.className.indexOf('/');
    if (slashIdx > 0) {
      result.packageName = result.className.slice(0, slashIdx);
    }
  }

  return result.packageName ? result : null;
}

/**
 * Auto-detect the input format and parse accordingly.
 *
 * Supports:
 *   1. Serialized Intent URI: `#Intent;…;end` or `intent://…#Intent;…;end`
 *   2. Multi-line Shortcut Maker format: `Action=…\nPackage Name=…\n…`
 */
export function parseIntentInput(text: string): ParsedIntent | null {
  const trimmed = text.trim();
  if (trimmed.includes('#Intent;')) {
    return parseIntentUri(trimmed);
  }
  return parseMultiLineFormat(trimmed);
}

/** @deprecated Use `parseIntentInput` instead (handles both formats). */
export const parseShortcutMakerText = parseIntentInput;

/* ─── Intent URL builder ─────────────────────────────────── */

export interface BuildIntentUrlOptions {
  /** Include a Play Store fallback URL. Default: `true`. */
  fallback?: boolean;
}

/**
 * Build a Chrome `intent://` URL from structured intent data.
 *
 * By default includes a Play Store fallback so the user is redirected to
 * install the app when it's not present on the device.
 *
 * @see https://developer.chrome.com/docs/android/intents
 */
export function buildIntentUrl(
  parsed: ParsedIntent | null,
  options: BuildIntentUrlOptions = {},
): string {
  if (!parsed) return '';

  const { fallback = true } = options;

  // Decompose dataUri into scheme + host/path for Chrome intent:// format
  let intentPath = '';
  let intentScheme = '';
  if (parsed.dataUri) {
    const match = parsed.dataUri.match(/^([^:]+):\/\/(.*)$/);
    if (match) {
      intentScheme = match[1];
      intentPath = match[2];
    }
  }

  const parts: string[] = [`intent://${intentPath}`];

  parts.push('#Intent');
  if (intentScheme) parts.push(`;scheme=${intentScheme}`);
  if (parsed.action) parts.push(`;action=${parsed.action}`);
  if (parsed.packageName) parts.push(`;package=${parsed.packageName}`);
  if (parsed.className) parts.push(`;component=${parsed.className}`);

  if (parsed.extras) {
    for (const [key, extra] of Object.entries(parsed.extras)) {
      parts.push(`;${extra.type}.${key}=${extra.value}`);
    }
  }

  if (fallback && parsed.packageName) {
    const url = encodeURIComponent(
      `https://play.google.com/store/apps/details?id=${parsed.packageName}`,
    );
    parts.push(`;S.browser_fallback_url=${url}`);
  }

  parts.push(';end');
  return parts.join('');
}

/** Quick check whether a string looks like an intent:// URL.
 * Recognises both the Chrome web format (`intent://`) and Android's
 * native `Intent.toUri()` format (`intent:#Intent;…;end`).
 */
export function isIntentUrl(url: string): boolean {
  return /^intent:(?:\/\/|#Intent;)/i.test(url);
}

/**
 * Normalise an intent URL to the Chrome web format (`intent://`).
 *
 * Android's `Intent.toUri(URI_INTENT_SCHEME)` produces `intent:#Intent;…;end`
 * (no double-slash). Chrome on Android handles this, but the `intent://` form
 * is the officially documented web format and is more reliably intercepted.
 *
 * If the input is already `intent://…` or is not an intent URL at all, it is
 * returned unchanged.
 */
export function normalizeIntentUrl(url: string): string {
  // intent:#Intent;… → intent://#Intent;…
  if (/^intent:#Intent;/i.test(url)) {
    return 'intent://' + url.slice('intent:'.length);
  }
  return url;
}

/**
 * Build a minimal intent:// URL that simply launches an app by its package name.
 *
 * Uses MAIN/LAUNCHER so the app opens its default (home) activity —
 * the same behaviour as tapping the icon in the launcher.
 * Includes a Play Store fallback by default.
 */
export function buildPackageOnlyUrl(
  packageName: string,
  options: BuildIntentUrlOptions = {},
): string {
  if (!packageName) return '';
  const { fallback = true } = options;
  const parts = [
    'intent://#Intent',
    ';action=android.intent.action.MAIN',
    `;package=${packageName}`,
  ];
  if (fallback) {
    parts.push(
      `;S.browser_fallback_url=${encodeURIComponent(
        `https://play.google.com/store/apps/details?id=${packageName}`,
      )}`,
    );
  }
  parts.push(';end');
  return parts.join('');
}

/**
 * Detect whether the current browser environment is Android.
 *
 * Uses `navigator.userAgentData` (high entropy, Chromium-only) with a
 * fallback to `navigator.userAgent` string matching.
 */
export function isAndroid(): boolean {
  // Modern Chromium: User-Agent Client Hints
  const uaData = (navigator as { userAgentData?: { platform?: string } }).userAgentData;
  if (uaData?.platform) return uaData.platform === 'Android';

  // Fallback: legacy User-Agent string
  return /android/i.test(navigator.userAgent);
}
