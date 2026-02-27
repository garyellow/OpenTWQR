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

  <!-- header: Open TWQR logo -->
  <text x="24" y="92" font-family="-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif"
        font-size="20" font-weight="700" fill="#008BBA">Open</text>
  <g transform="translate(74 72) scale(0.75)">
    <path d="M52.2361 0H49.8023C49.2424 0 48.7587.407466 48.6774.947083L45.8226 20.109 43.2998 13.5523C42.6628 11.8961 40.9889 10.7839 39.1354 10.7839 37.2819 10.7839 35.6071 11.8961 34.9692 13.5523L32.4982 19.9752 30.7531 5.46225C30.3787 2.34822 27.6052 0 24.3006 0H1.13599C.509121 0 0 .496414 0 1.10719V3.73073C0 4.3415.509121 4.83707 1.13599 4.83707H10.3747V28.8937C10.3747 29.5036 10.8838 29.9992 11.5107 29.9992H13.9394C14.5663 29.9992 15.0754 29.5036 15.0754 28.8937V4.83707H23.9863C24.758 4.83707 25.4044 5.36991 25.4891 6.07556L28.0389 27.2723C28.2261 28.8276 29.6044 30 31.2453 30 32.5642 30 33.7367 29.2478 34.2339 28.083L38.9033 17.139C38.9549 17.017 39.0829 17.0043 39.1371 17.0043 39.1913 17.0043 39.3175 17.017 39.37 17.139L44.0394 28.083C44.5366 29.2478 45.7099 30 47.028 30 48.6689 30 50.048 28.8276 50.2344 27.2723L53.3637 1.23595C53.4009.928446 53.3027.617552 53.0951.382899 52.8799.139775 52.5665 0 52.2361 0Z" fill="#E74E95"/>
    <path d="M76.5387 24.5081C75.8262 24.5081 75.1689 24.453 74.5505 24.3582 73.8228 24.8622 72.9265 25.1629 71.954 25.1629H64.6662C62.2503 25.1629 60.2858 23.3247 60.2858 21.0654V8.93375C60.2858 6.67533 62.2503 4.83622 64.6662 4.83622H71.954C74.37 4.83622 76.3345 6.67448 76.3345 8.93375V20.2522C76.4048 20.2539 76.4667 20.2623 76.5387 20.2623 78.6768 20.2623 80.0915 19.5126 81.0352 18.5189V8.28486C81.0352 3.71633 77.1122 0 72.2895 0H64.3316C59.509 0 55.5859 3.71717 55.5859 8.28486V21.7151C55.5859 26.2837 59.509 30 64.3316 30H72.2895C76.3625 30 79.7832 27.346 80.7523 23.7703 79.5807 24.2319 78.1906 24.509 76.5395 24.509" fill="#008BBA"/>
    <path d="M102.88 29.8187C102.995 29.9331 103.152 29.9991 103.318 29.9991 103.341 29.9991 103.361 29.9881 103.383 29.9864 103.189 29.9619 103.007 29.8899 102.852 29.7747 102.863 29.7891 102.868 29.8052 102.881 29.8187" fill="#008BBA"/>
    <path d="M109.296 7.81047C109.296 3.5037 105.598 0 101.053 0H89.6868C89.0599 0 88.5508.496414 88.5508 1.10719V3.73073C88.5508 4.34066 89.0599 4.83622 89.6868 4.83622H101.809C102.71 4.83622 103.549 5.26741 104.001 5.95951 104.699 7.02942 104.79 8.16118 104.256 9.14723 103.71 10.1562 102.618 10.7839 101.407 10.7839H92.733C90.4272 10.7839 88.5508 12.5679 88.5508 14.762 88.5508 15.8234 89.0074 16.8586 89.8028 17.6024L102.747 29.6916C102.78 29.7221 102.817 29.7467 102.854 29.773 103.01 29.8873 103.192 29.9602 103.386 29.9847 103.434 29.9907 103.482 29.9992 103.533 29.9992H107.434C107.907 29.9992 108.323 29.7213 108.494 29.2918 108.658 28.8776 108.553 28.4083 108.225 28.0982L95.027 15.6209H101.053C105.598 15.6209 109.296 12.1172 109.296 7.81047Z" fill="#008BBA"/>
    <path d="M83.2266 29.9991H86.9522V26.2735H83.2266V29.9991ZM83.6357 26.6835H86.543V29.5908H83.6357V26.6835Z" fill="#008BBA"/>
    <path d="M86.2642 26.9648H83.9219V29.307H86.2642V26.9648Z" fill="#008BBA"/>
    <path d="M76.3333 20.2522C71.3979 20.1369 70.4068 16.0055 70.2136 14.2113 70.1552 13.6709 69.6842 13.2625 69.1166 13.2625H67.3597C66.9971 13.2625 66.654 13.4125 66.4185 13.6759 66.1932 13.925 66.089 14.2444 66.1237 14.5713 66.3499 16.7112 67.6189 23.2942 74.5492 24.3573 75.1676 24.4522 75.8258 24.5072 76.5374 24.5072 78.1885 24.5072 79.5786 24.2302 80.7493 23.7686 85.7168 21.81 86.7393 16.5036 86.9452 14.6273 86.9807 14.302 86.874 13.9724 86.6521 13.7251 86.4157 13.4608 86.0718 13.31 85.7101 13.31H84.0751C83.4474 13.31 82.9179 13.7615 82.8425 14.3613 82.7155 15.3812 82.3063 17.1737 81.0331 18.5172 80.0902 19.5118 78.6747 20.2606 76.5366 20.2606 76.4646 20.2606 76.4027 20.2513 76.3324 20.2505" fill="#E74E95"/>
  </g>

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
