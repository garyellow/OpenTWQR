/**
 * Resolve a user-supplied icon URL to a displayable image source.
 *
 * Three resolution modes:
 *
 * 1. **Known image extension** — if the URL path ends with a known image
 *    extension (`.ico`, `.png`, `.jpg`, `.jpeg`, `.svg`, `.webp`, `.gif`,
 *    `.avif`, `.bmp`), it is returned as-is.
 *
 * 2. **Extensionless image URL** — if the URL has path segments beyond
 *    the root `/` (e.g. `https://cdn.example.com/avatar/123`,
 *    `https://api.example.com/icon?id=42`), or has query/hash parameters,
 *    it is treated as a potential direct image URL and returned as-is.
 *    The `<img>` element's `onError` handler in `BankIcon` will catch
 *    non-image responses gracefully.
 *
 * 3. **Homepage URL** — bare-origin URLs like `https://example.com` or
 *    `https://example.com/` are treated as a website and resolved to
 *    `${origin}/favicon.ico`.
 *
 * Returns `undefined` for empty, blank, or non-https input.
 */

const IMAGE_EXT_RE = /\.(ico|png|jpe?g|svg|webp|gif|avif|bmp)$/i;

export const resolveIconSrc = (iconUrl: string | undefined): string | undefined => {
  if (!iconUrl) return undefined;

  const trimmed = iconUrl.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed);

    // Only HTTPS — CSP restricts img-src to https:
    if (url.protocol !== 'https:') return undefined;

    // Known image extension — use as-is
    if (IMAGE_EXT_RE.test(url.pathname)) return url.href;

    // Extensionless URL with path / query / hash — likely a direct image
    // (e.g. CDN, API endpoint, Google's favicon service).
    // BankIcon's `onError` gracefully falls back if this is wrong.
    const hasPath = url.pathname.replace(/\/+$/, '').length > 0;
    if (hasPath || url.search || url.hash) return url.href;

    // Bare-origin homepage — derive favicon
    return `${url.origin}/favicon.ico`;
  } catch {
    return undefined;
  }
};
