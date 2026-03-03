/**
 * Optional text labels to render around the QR code in exported PNGs.
 * Rendered in order: customName above QR, then bankLine + accountLine below.
 */
export interface QRExportLabels {
  /** Custom message / display name above QR (bold). */
  customName?: string;
  /** Bank line below QR, e.g. "(700) 中華郵政". */
  bankLine?: string;
  /** Account number below bank line (monospace). */
  accountLine?: string;
}

/**
 * Render an HTMLCanvasElement (from StyledQRCode) to a PNG Blob with proper
 * DPR scaling and optional text labels above / below the QR image.
 */
export const canvasToBlob = async (
  qrCanvas: HTMLCanvasElement,
  qrSize: number,
  padding = 32,
  labels?: QRExportLabels,
): Promise<Blob> => {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);

  /* ---- label layout constants ---- */
  const FONT_ACCOUNT = '11px ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
  const FONT_BANK = '11px system-ui, -apple-system, sans-serif';
  const FONT_NAME = '600 13px system-ui, -apple-system, sans-serif';
  const COLOR_LIGHT = '#a1a1aa'; // zinc-400
  const COLOR_DARK = '#3f3f46';  // zinc-700

  const hasCustomName = Boolean(labels?.customName);
  const hasBankLine = Boolean(labels?.bankLine);
  const hasAccountLine = labels?.accountLine !== undefined;
  const topExtra = hasCustomName ? 22 : 0;
  const bottomExtra = (hasBankLine || hasAccountLine)
    ? 10 + (hasBankLine ? 16 : 0) + (hasAccountLine ? 16 : 0) + (hasBankLine && hasAccountLine ? 2 : 0)
    : 0;

  const logicalW = qrSize + padding * 2;
  const logicalH = qrSize + padding * 2 + topExtra + bottomExtra;
  const physicalW = Math.round(logicalW * dpr);
  const physicalH = Math.round(logicalH * dpr);

  const canvas = document.createElement('canvas');
  canvas.width = physicalW;
  canvas.height = physicalH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.scale(dpr, dpr);

  /* ---- white background ---- */
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, logicalW, logicalH);

  const qrY = padding + topExtra;

  /* ---- custom name above QR ---- */
  if (labels?.customName) {
    ctx.font = FONT_NAME;
    ctx.fillStyle = COLOR_DARK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(labels.customName, logicalW / 2, qrY - 6);
  }

  /* ---- QR canvas ---- */
  ctx.drawImage(qrCanvas, padding, qrY, qrSize, qrSize);

  /* ---- labels below QR ---- */
  if (hasBankLine || hasAccountLine) {
    ctx.textAlign = 'center';
    let labelY = qrY + qrSize + 10;
    if (labels?.bankLine) {
      ctx.font = FONT_BANK;
      ctx.fillStyle = COLOR_LIGHT;
      ctx.textBaseline = 'top';
      ctx.fillText(labels.bankLine, logicalW / 2, labelY);
      labelY += 16 + (hasAccountLine ? 2 : 0);
    }
    if (labels?.accountLine) {
      ctx.font = FONT_ACCOUNT;
      ctx.fillStyle = COLOR_LIGHT;
      ctx.textBaseline = 'top';
      ctx.fillText(labels.accountLine, logicalW / 2, labelY);
    }
  }

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
      'image/png',
    ),
  );
};

/**
 * Trigger a file download for the given Blob.
 * Revoke the object URL after a delay so async browsers (e.g. Firefox)
 * have time to initiate the download before the URL is invalidated.
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
