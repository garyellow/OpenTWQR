import {
  LOGO_VIEWBOX,
  TEAL,
  PINK,
  OPEN_PATH,
  TWQR_TRANSLATE_X,
  TWQR_TW,
  TWQR_Q_OUTER,
  TWQR_R_TIP,
  TWQR_R_BODY,
  TWQR_PERIOD_OUTER,
  TWQR_PERIOD_INNER,
  TWQR_QR_ACCENTS,
  VERTICAL_VIEWBOX,
  VERTICAL_OPEN_X,
  VERTICAL_OPEN_Y,
  VERTICAL_TWQR_X,
  VERTICAL_TWQR_Y,
} from '../../data/logoPaths';

interface OpenTWQRLogoProps {
  className?: string;
  /**
   * Layout variant:
   * - `'horizontal'` — "Open" left, "TWQR" right (rectangle, default)
   * - `'vertical'`   — "Open" top, "TWQR" bottom (square-ish)
   */
  variant?: 'horizontal' | 'vertical';
}

/**
 * "Open TWQR" branding logo as a single integrated SVG — fully vector.
 *
 * Path data is shared via `src/data/logoPaths.ts` (canonical source).
 *
 * Design rationale:
 * - "Open" — Montserrat SemiBold (600) filled outlines in TWQR brand teal
 *   (#008BBA). Stem width ≈ 4.3 matches TWQR's ≈ 4.7 for visual harmony.
 * - "TWQR" — official logo vector paths in standard brand colours:
 *   - Pink (#E74E95) for the stylised TW heartbeat + QR interior accents
 *   - Teal (#008BBA) for Q, R, period and structural elements
 *
 * Both halves are pure `<path>` elements — no `<text>`, so rendering is
 * identical everywhere regardless of installed fonts.
 */
export const OpenTWQRLogo = ({ className, variant = 'horizontal' }: OpenTWQRLogoProps) => {
  const isVertical = variant === 'vertical';
  const viewBox = isVertical ? VERTICAL_VIEWBOX : LOGO_VIEWBOX;
  const openTransform = isVertical
    ? `translate(${VERTICAL_OPEN_X} ${VERTICAL_OPEN_Y})`
    : undefined;
  const twqrTransform = isVertical
    ? `translate(${VERTICAL_TWQR_X} ${VERTICAL_TWQR_Y})`
    : `translate(${TWQR_TRANSLATE_X} 0)`;

  return (
    <svg
      viewBox={viewBox}
      className={className}
      role="img"
      aria-label="Open TWQR"
    >
      <title>Open TWQR</title>

      {/* ── "Open" — Montserrat SemiBold filled outlines (teal) ── */}
      <g transform={openTransform}>
        <path d={OPEN_PATH} fill={TEAL} />
      </g>

      {/* ── TWQR official logo paths ─────────────────────────────── */}
      <g transform={twqrTransform}>
        {/* TW — stylised heartbeat (pink) */}
        <path d={TWQR_TW} fill={PINK} />
        {/* Q — outer shape (teal) */}
        <path d={TWQR_Q_OUTER} fill={TEAL} />
        {/* R — tip fragment (teal) */}
        <path d={TWQR_R_TIP} fill={TEAL} />
        {/* R — body + diagonal stroke (teal) */}
        <path d={TWQR_R_BODY} fill={TEAL} />
        {/* Period — outer (teal) */}
        <path d={TWQR_PERIOD_OUTER} fill={TEAL} />
        {/* Period — inner (teal) */}
        <path d={TWQR_PERIOD_INNER} fill={TEAL} />
        {/* QR interior accents (pink) */}
        <path d={TWQR_QR_ACCENTS} fill={PINK} />
      </g>
    </svg>
  );
};
