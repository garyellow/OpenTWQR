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

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, logicalSize, logicalSize);

  const svgData = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      ctx.drawImage(img, padding, padding, qrSize, qrSize);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });

  return new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/png'),
  );
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
