/**
 * Resolve a user-supplied icon URL to a displayable image source.
 *
 * Two usage modes:
 *
 * 1. **Direct image URL** — if the URL path ends with a known image extension
 *    (`.ico`, `.png`, `.jpg`, `.jpeg`, `.svg`, `.webp`, `.gif`), it is returned as-is.
 *
 * 2. **Bank / website URL** — any other `https://` URL is treated as a homepage.
 *    The favicon is derived as `${origin}/favicon.ico`.
 *
 * Returns `undefined` for empty, blank, or non-https input.
 */

const IMAGE_EXT_RE = /\.(ico|png|jpe?g|svg|webp|gif)$/i;

export const resolveIconSrc = (iconUrl: string | undefined): string | undefined => {
  if (!iconUrl) return undefined;

  const trimmed = iconUrl.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed);

    // Only HTTPS — CSP restricts img-src to https:
    if (url.protocol !== 'https:') return undefined;

    // Direct image URL — use as-is
    if (IMAGE_EXT_RE.test(url.pathname)) return url.href;

    // Website URL — derive favicon
    return `${url.origin}/favicon.ico`;
  } catch {
    return undefined;
  }
};
