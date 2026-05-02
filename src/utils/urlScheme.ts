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
 *
 * Automatically normalises intent:// URLs so that previously-stored
 * templates with incompatible MAIN/LAUNCHER flags still work.
 */
export function buildBankUrl(template: string, params: UrlSchemeParams): string {
  return normalizeIntentUrl(template)
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

const getXmlAttr = (attrs: string, name: string): string | undefined => {
  const escapedName = name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const match = attrs.match(new RegExp(`\\b${escapedName}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2];
};

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
  // Skip action=MAIN — it targets the launcher activity which never
  // declares CATEGORY_BROWSABLE.  Chrome auto-adds BROWSABLE to all
  // web-initiated intents, so MAIN would cause resolution failure.
  if (parsed.action && parsed.action !== 'android.intent.action.MAIN') {
    parts.push(`;action=${parsed.action}`);
  }
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
 * Normalise an intent URL to the Chrome web format (`intent://`) and strip
 * flags that are incompatible with Chrome's web-initiated intent handling.
 *
 * 1. `intent:#Intent;…;end` → `intent://#Intent;…;end`
 *    Android's `Intent.toUri(URI_INTENT_SCHEME)` omits the double-slash;
 *    the `intent://` form is the officially documented web format.
 *
 * 2. Removes `action=android.intent.action.MAIN` and
 *    `category=android.intent.category.LAUNCHER`.
 *    Chrome automatically adds `CATEGORY_BROWSABLE` to every web-initiated
 *    intent.  Launcher activities typically only declare MAIN + LAUNCHER
 *    (without BROWSABLE), so keeping these flags causes intent resolution
 *    to fail and triggers the Play Store fallback.
 *
 * If the input is not an intent URL it is returned unchanged.
 */
export function normalizeIntentUrl(url: string): string {
  if (!isIntentUrl(url)) return url;

  let result = url;

  // intent:#Intent;… → intent://#Intent;…
  if (/^intent:#Intent;/i.test(result)) {
    result = 'intent://' + result.slice('intent:'.length);
  }

  // Strip MAIN action — incompatible with Chrome's auto-added BROWSABLE.
  result = result.replace(/;action=android\.intent\.action\.MAIN/gi, '');
  // Strip LAUNCHER category — same conflict.
  result = result.replace(/;category=android\.intent\.category\.LAUNCHER/gi, '');

  return result;
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

/* ─── AndroidManifest.xml Parser ─────────────────────────── */

/**
 * A launchable deep link extracted from an AndroidManifest.xml intent-filter.
 *
 * Only intent-filters with ACTION_VIEW + CATEGORY_BROWSABLE are included,
 * because Chrome enforces the BROWSABLE category for all web-initiated intents.
 */
export interface ManifestDeepLink {
  /** Activity name, e.g. `com.example.app/.DeepLinkActivity` */
  activityName: string;
  /** Reconstructed URL scheme, e.g. `myapp://host/path` or `https://example.com/path` */
  url: string;
  /** Raw scheme, e.g. `myapp`, `https` */
  scheme: string;
  /** Optional host */
  host?: string;
  /** Optional path / pathPrefix / pathPattern */
  path?: string;
  /** Package name inferred from manifest */
  packageName?: string;
}

/**
 * Parse an AndroidManifest.xml string and extract all launchable deep links.
 *
 * Searches for `<activity>` elements that contain `<intent-filter>` blocks with:
 *   - `<action android:name="android.intent.action.VIEW" />`
 *   - `<category android:name="android.intent.category.BROWSABLE" />`
 *   - At least one `<data android:scheme="…" />` element
 *
 * Returns an array of `ManifestDeepLink` objects sorted by scheme then activity.
 * Returns an empty array if no launchable deep links are found.
 */
export function parseManifestXml(xml: string): ManifestDeepLink[] {
  const results: ManifestDeepLink[] = [];

  // Extract package name from <manifest package="...">
  const manifestMatch = xml.match(/<manifest\b[^>]*>/i);
  const packageName = manifestMatch ? getXmlAttr(manifestMatch[0], 'package') : undefined;

  // Use regex-based approach for robustness (no DOMParser dependency for XML namespaces)
  // Match each <activity ...>...</activity> block (non-greedy, supports self-closing)
  const activityRegex = /<activity\b([^>]*)>([\s\S]*?)<\/activity>/gi;
  let actMatch: RegExpExecArray | null;

  while ((actMatch = activityRegex.exec(xml)) !== null) {
    const actAttrs = actMatch[1];
    const actBody = actMatch[2];

    // Extract activity name
    const activityName = getXmlAttr(actAttrs, 'android:name');
    if (!activityName) continue;

    // Find all intent-filter blocks within this activity
    const filterRegex = /<intent-filter\b[^>]*>([\s\S]*?)<\/intent-filter>/gi;
    let filterMatch: RegExpExecArray | null;

    while ((filterMatch = filterRegex.exec(actBody)) !== null) {
      const filterBody = filterMatch[1];

      // Check for ACTION_VIEW
      if (!/android:name\s*=\s*(["'])android\.intent\.action\.VIEW\1/i.test(filterBody)) continue;

      // Check for CATEGORY_BROWSABLE
      if (!/android:name\s*=\s*(["'])android\.intent\.category\.BROWSABLE\1/i.test(filterBody)) continue;

      // Extract all <data> elements — handle / and special chars inside quoted attribute values
      const dataRegex = /<data\s+((?:[^"'>]|"[^"]*"|'[^']*')*)\/?\s*>/gi;
      let dataMatch: RegExpExecArray | null;

      // Collect scheme/host/path attributes across all <data> elements in this filter
      // Per Android docs, attributes from multiple <data> elements are combined.
      const schemes: string[] = [];
      const hosts: string[] = [];
      const paths: string[] = [];

      while ((dataMatch = dataRegex.exec(filterBody)) !== null) {
        const attrs = dataMatch[1];

        const scheme = getXmlAttr(attrs, 'android:scheme');
        if (scheme && !schemes.includes(scheme)) schemes.push(scheme);

        const host = getXmlAttr(attrs, 'android:host');
        if (host && !hosts.includes(host)) hosts.push(host);

        // Prefer pathPrefix > path > pathPattern
        const p = getXmlAttr(attrs, 'android:pathPrefix')
          || getXmlAttr(attrs, 'android:path')
          || getXmlAttr(attrs, 'android:pathPattern');
        if (p && !paths.includes(p)) paths.push(p);
      }

      if (schemes.length === 0) continue;

      // Generate combinations of scheme × host × path
      // If no hosts, just scheme. If no paths, scheme://host.
      for (const scheme of schemes) {
        if (hosts.length === 0) {
          results.push({
            activityName,
            url: `${scheme}://`,
            scheme,
            packageName,
          });
        } else {
          for (const host of hosts) {
            if (paths.length === 0) {
              results.push({
                activityName,
                url: `${scheme}://${host}`,
                scheme,
                host,
                packageName,
              });
            } else {
              for (const path of paths) {
                results.push({
                  activityName,
                  url: `${scheme}://${host}${path}`,
                  scheme,
                  host,
                  path,
                  packageName,
                });
              }
            }
          }
        }
      }
    }
  }

  // Sort: custom schemes first, then by scheme name, then by activity
  results.sort((a, b) => {
    const aIsHttp = a.scheme === 'http' || a.scheme === 'https';
    const bIsHttp = b.scheme === 'http' || b.scheme === 'https';
    if (aIsHttp !== bIsHttp) return aIsHttp ? 1 : -1;
    const schemeCmp = a.scheme.localeCompare(b.scheme);
    if (schemeCmp !== 0) return schemeCmp;
    return a.activityName.localeCompare(b.activityName);
  });

  return results;
}
