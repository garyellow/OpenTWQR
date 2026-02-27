/**
 * Inline SVG data URI for the "OpenTWQR" centre label.
 * Vector text — stays sharp at any size, no external resource needed.
 */
const src = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="68" height="18">' +
    '<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" ' +
    'font-family="system-ui,sans-serif" font-size="10.5" font-weight="700" ' +
    'fill="#18181b" letter-spacing="0.3">OpenTWQR</text></svg>',
)}`;

/** `qrcode.react` imageSettings for embedding the centre label with excavation. */
export const QR_CENTER_IMAGE = { src, width: 68, height: 18, excavate: true } as const;
