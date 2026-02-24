/**
 * Generate PWA static assets:
 *   public/apple-touch-icon.png  (180×180)
 *   public/screenshots/receive-light.png  (390×844)
 *   public/screenshots/receive-dark.png   (390×844)
 *
 * Run: node scripts/generate-pwa-assets.mjs
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ─── apple-touch-icon.png ─────────────────────────────────────────── */
const iconSvg = readFileSync(path.join(ROOT, 'public/pwa-192x192.svg'));

await sharp(iconSvg)
  .resize(180, 180)
  .png()
  .toFile(path.join(ROOT, 'public/apple-touch-icon.png'));

console.log('✓ public/apple-touch-icon.png (180×180)');

/* ─── Screenshots ───────────────────────────────────────────────────── */
mkdirSync(path.join(ROOT, 'public/screenshots'), { recursive: true });

const W = 390;
const H = 844;

/**
 * Build a screenshot SVG mockup of the receive page.
 * @param {boolean} dark
 */
function buildScreenshotSvg(dark) {
  const bg        = dark ? '#09090b' : '#f4f4f5';   // zinc-950 / zinc-100
  const card      = dark ? '#18181b' : '#ffffff';   // zinc-900 / white
  const border    = dark ? '#27272a' : '#e4e4e7';   // zinc-800 / zinc-200
  const textPri   = dark ? '#f4f4f5' : '#09090b';   // zinc-100 / zinc-950
  const textSec   = dark ? '#71717a' : '#71717a';   // zinc-500
  const accent    = '#10b981';                       // emerald-500
  const btnBg     = dark ? '#fafafa' : '#18181b';
  const btnTxt    = dark ? '#09090b' : '#ffffff';

  // QR cells pattern (simplified checkerboard inside a grid to simulate a QR)
  const qrSize     = 170;
  const qrX        = (W - qrSize) / 2;
  const qrY        = 270;
  const cellCount  = 17;
  const cell       = qrSize / cellCount;

  // Generate a deterministic QR-like pattern
  const pattern = [
    [1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,1,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1],  // finder
    [1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0],
    [1,0,1,1,0,1,1,0,1,0,1,0,1,1,0,1,1],
    [0,1,0,0,1,1,0,1,0,1,0,1,0,0,1,0,0],
    [1,0,1,1,0,1,1,0,1,0,1,0,1,1,0,1,0],
    [0,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0,0],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,1,0,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,1,0,1,0],
    [1,0,0,0,0,0,1,0,0,1,0,0,0,0,1,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,1,0,1,1],
  ];

  const fgColor = '#000000';

  const cells = pattern.flatMap((row, r) =>
    row.map((v, c) =>
      v ? `<rect x="${qrX + c * cell}" y="${qrY + r * cell}" width="${cell}" height="${cell}" fill="${fgColor}"/>` : ''
    )
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- background -->
  <rect width="${W}" height="${H}" fill="${bg}"/>

  <!-- status bar placeholder -->
  <rect x="20" y="14" width="40" height="8" rx="4" fill="${textSec}" opacity="0.3"/>
  <rect x="${W - 70}" y="14" width="50" height="8" rx="4" fill="${textSec}" opacity="0.3"/>

  <!-- header -->
  <text x="24" y="92" font-family="-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif"
        font-size="26" font-weight="700" fill="${textPri}">收款</text>

  <!-- account card -->
  <rect x="20" y="112" width="${W - 40}" height="72" rx="16" fill="${card}" stroke="${border}" stroke-width="1"/>
  <rect x="36" y="128" width="40" height="40" rx="10" fill="${bg}" stroke="${border}" stroke-width="1"/>
  <text x="56" y="153" font-family="monospace" font-size="11" fill="${textSec}" text-anchor="middle">013</text>
  <text x="94" y="145" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="15" font-weight="600" fill="${textPri}">國泰世華銀行</text>
  <text x="94" y="166" font-family="monospace" font-size="12" fill="${textSec}">****  ****  3721</text>

  <!-- amount -->
  <text x="${W / 2}" y="248" font-family="-apple-system,BlinkMacSystemFont,sans-serif"
        font-size="20" font-weight="600" fill="${accent}" text-anchor="middle">NT$</text>
  <text x="${W / 2 + 4}" y="${248 + 36}" font-family="-apple-system,BlinkMacSystemFont,sans-serif"
        font-size="54" font-weight="800" fill="${textPri}" text-anchor="middle">500</text>

  <!-- QR code area (white card) -->
  <rect x="${qrX - 20}" y="${qrY - 20}" width="${qrSize + 40}" height="${qrSize + 40}" rx="20" fill="white" stroke="${border}" stroke-width="1"/>
  ${cells}

  <!-- note row -->
  <text x="${W / 2}" y="${qrY + qrSize + 46}" font-family="-apple-system,BlinkMacSystemFont,sans-serif"
        font-size="13" fill="${textSec}" text-anchor="middle">備註：晚餐費</text>

  <!-- generate button -->
  <rect x="20" y="${H - 96}" width="${W - 40}" height="56" rx="18" fill="${btnBg}"/>
  <text x="${W / 2}" y="${H - 60}" font-family="-apple-system,BlinkMacSystemFont,sans-serif"
        font-size="17" font-weight="600" fill="${btnTxt}" text-anchor="middle">產生 QR Code</text>

  <!-- bottom safe area -->
  <rect x="${W / 2 - 60}" y="${H - 22}" width="120" height="4" rx="2" fill="${textSec}" opacity="0.3"/>
</svg>`;
}

await sharp(Buffer.from(buildScreenshotSvg(false)))
  .resize(W, H)
  .png()
  .toFile(path.join(ROOT, 'public/screenshots/receive-light.png'));

console.log('✓ public/screenshots/receive-light.png (390×844)');

await sharp(Buffer.from(buildScreenshotSvg(true)))
  .resize(W, H)
  .png()
  .toFile(path.join(ROOT, 'public/screenshots/receive-dark.png'));

console.log('✓ public/screenshots/receive-dark.png (390×844)');
console.log('\nAll PWA assets generated successfully.');
