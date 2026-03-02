import { VERTICAL_LOGO_SVG_STRING } from '../data/logoPaths';

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

const VERTICAL_SRC = `data:image/svg+xml,${encodeURIComponent(VERTICAL_LOGO_SVG_STRING)}`;

/** Vertical / square "Open TWQR" logo — Open on top, TWQR below. */
export const QR_CENTER_IMAGE_VERTICAL = { src: VERTICAL_SRC, width: 64, height: 44, excavate: true } as const;

export interface QRCenterImageSettings {
  src: string;
  width: number;
  height: number;
  excavate: boolean;
}
