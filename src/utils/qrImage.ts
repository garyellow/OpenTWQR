/**
 * Render a QR Code SVG element to a PNG Blob with proper DPR scaling.
 */
export const svgToBlob = async (
  svgEl: SVGSVGElement,
  qrSize: number,
  padding = 32,
): Promise<Blob> => {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const logicalSize = qrSize + padding * 2;
  const physicalSize = Math.round(logicalSize * dpr);

  const canvas = document.createElement('canvas');
  canvas.width = physicalSize;
  canvas.height = physicalSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, logicalSize, logicalSize);

  const svgData = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, padding, padding, qrSize, qrSize);
        resolve();
      };
      img.onerror = () => reject(new Error('Failed to load SVG as image'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
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
