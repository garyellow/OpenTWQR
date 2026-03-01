import { LOGO_SVG_STRING, VERTICAL_LOGO_SVG_STRING } from '../data/logoPaths';
import type { QRLogoType } from '../stores/useQRSettingsStore';

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

const HORIZONTAL_SRC = `data:image/svg+xml,${encodeURIComponent(LOGO_SVG_STRING)}`;
const VERTICAL_SRC = `data:image/svg+xml,${encodeURIComponent(VERTICAL_LOGO_SVG_STRING)}`;

/** `qrcode.react` imageSettings for embedding the colourful centre label with excavation. */
export const QR_CENTER_IMAGE = { src: HORIZONTAL_SRC, width: 108, height: 19, excavate: true } as const;

/** Vertical / square "Open TWQR" logo — used when no name label is displayed. */
export const QR_CENTER_IMAGE_VERTICAL = { src: VERTICAL_SRC, width: 64, height: 44, excavate: true } as const;

export interface QRCenterImageSettings {
  src: string;
  width: number;
  height: number;
  excavate: boolean;
}

/**
 * Build the appropriate QR center image settings based on user preferences.
 *
 * Logic:
 * - `logoType === 'bank'` and a bank icon URL is available → bank favicon (square).
 * - `logoType === 'opentwqr'` (or bank icon unavailable):
 *   - If there's name/bank label info displayed → horizontal logo (compact).
 *   - If no label info → vertical / stacked logo (more prominent).
 */
export function buildQRCenterImage(options: {
  logoType: QRLogoType;
  hasLabelInfo: boolean;
  bankIconUrl?: string;
}): QRCenterImageSettings {
  const { logoType, hasLabelInfo, bankIconUrl } = options;

  if (logoType === 'bank' && bankIconUrl) {
    return { src: bankIconUrl, width: 40, height: 40, excavate: true };
  }

  // OpenTWQR logo — choose layout based on whether label info is present
  if (hasLabelInfo) {
    return { ...QR_CENTER_IMAGE };
  }
  return { ...QR_CENTER_IMAGE_VERTICAL };
}
