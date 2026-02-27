/**
 * Generate PWA static assets:
 *   public/apple-touch-icon.png  (180×180)
 *
 * Run: node scripts/generate-pwa-assets.mjs
 */

import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ─── apple-touch-icon.png ─────────────────────────────────────────── */
const iconSvg = readFileSync(path.join(ROOT, 'public/pwa-icon.svg'));

await sharp(iconSvg)
  .resize(180, 180)
  .png()
  .toFile(path.join(ROOT, 'public/apple-touch-icon.png'));

console.log('✓ public/apple-touch-icon.png (180×180)');
