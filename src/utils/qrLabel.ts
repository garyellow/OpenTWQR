import { LOGO_SVG_STRING } from '../data/logoPaths';

/**
 * Inline SVG data URI for the colourful "Open TWQR" centre label — fully vector.
 *
 * Path data is shared via `src/data/logoPaths.ts` (canonical source).
 *
 * - "Open" — Montserrat SemiBold (600) filled outlines in TWQR brand teal (#008BBA)
 * - "TWQR" — official vector paths in standard brand colours:
 *   - Pink (#E74E95) for the stylised TW heartbeat + QR interior accents
 *   - Teal (#008BBA) for Q, R, period and structural elements
 *
 * Both halves are pure `<path>` — no `<text>`, rendering identically everywhere.
 */

const src = `data:image/svg+xml,${encodeURIComponent(LOGO_SVG_STRING)}`;

/** `qrcode.react` imageSettings for embedding the colourful centre label with excavation. */
export const QR_CENTER_IMAGE = { src, width: 95, height: 17, excavate: true } as const;
