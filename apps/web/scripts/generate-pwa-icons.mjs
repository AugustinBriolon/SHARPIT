/**
 * Generates PWA PNGs + favicon.ico from the brand mark SVGs.
 * Keep colors in sync with `src/lib/brand-icon.ts`.
 *
 * - icon-192 / icon-512: “any” (from favicon.svg)
 * - icon-512-maskable: full-bleed canvas + mark in the centered 80% safe zone
 * - favicon.ico: 16 + 32 PNG-in-ICO
 */
import sharp from 'sharp';
import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public/icons');
const publicDir = join(root, 'public');

/** SYNC with src/lib/brand-icon.ts */
const CANVAS_FLAT = '#fcfcf7';
const WELL_FILL = '#e8f9c8';
const WELL_BORDER = '#2f6b28';
const STROKE = '#2f6b28';
const PATH = 'M22 12h-4l-3 9L9 3l-3 9H2';
const MASKABLE_RATIO = 0.8;

mkdirSync(outDir, { recursive: true });

const faviconSvg = readFileSync(join(publicDir, 'favicon.svg'));

function maskableSvg(size) {
  const content = Math.round(size * MASKABLE_RATIO);
  const offset = Math.round((size - content) / 2);
  const wellPad = Math.round(content * 0.125);
  const wellSize = content - wellPad * 2;
  const wellRx = Math.round(wellSize * 0.22);
  const strokePad = Math.round(wellSize * 0.22);
  const vb = 24;
  const pathScale = (wellSize - strokePad * 2) / vb;
  const pathTx = offset + wellPad + strokePad;
  const pathTy = pathTx;
  const borderW = Math.max(2, Math.round(size / 128));

  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
  <rect width="${size}" height="${size}" fill="${CANVAS_FLAT}"/>
  <rect x="${offset + wellPad}" y="${offset + wellPad}" width="${wellSize}" height="${wellSize}" rx="${wellRx}" fill="${WELL_FILL}" stroke="${WELL_BORDER}" stroke-opacity="0.4" stroke-width="${borderW}"/>
  <g transform="translate(${pathTx} ${pathTy}) scale(${pathScale})">
    <path d="${PATH}" stroke="${STROKE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>`);
}

await Promise.all([
  sharp(faviconSvg).resize(192, 192).png().toFile(join(outDir, 'icon-192.png')),
  sharp(faviconSvg).resize(512, 512).png().toFile(join(outDir, 'icon-512.png')),
  sharp(maskableSvg(512)).png().toFile(join(outDir, 'icon-512-maskable.png')),
]);

const ico16 = await sharp(faviconSvg).resize(16, 16).png().toBuffer();
const ico32 = await sharp(faviconSvg).resize(32, 32).png().toBuffer();
const metas = await Promise.all([sharp(ico16).metadata(), sharp(ico32).metadata()]);
const pngs = [
  { buf: ico16, w: metas[0].width ?? 16, h: metas[0].height ?? 16 },
  { buf: ico32, w: metas[1].width ?? 32, h: metas[1].height ?? 32 },
];

const headerSize = 6 + pngs.length * 16;
let dataOffset = headerSize;
const header = Buffer.alloc(headerSize);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
const chunks = [];
pngs.forEach((png, i) => {
  const entry = 6 + i * 16;
  header.writeUInt8(png.w >= 256 ? 0 : png.w, entry);
  header.writeUInt8(png.h >= 256 ? 0 : png.h, entry + 1);
  header.writeUInt8(0, entry + 2);
  header.writeUInt8(0, entry + 3);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.buf.length, entry + 8);
  header.writeUInt32LE(dataOffset, entry + 12);
  dataOffset += png.buf.length;
  chunks.push(png.buf);
});
writeFileSync(join(publicDir, 'favicon.ico'), Buffer.concat([header, ...chunks]));

const any512 = readFileSync(join(outDir, 'icon-512.png'));
const mask512 = readFileSync(join(outDir, 'icon-512-maskable.png'));
if (Buffer.compare(any512, mask512) === 0) {
  throw new Error('icon-512-maskable.png must differ from icon-512.png (safe-zone padding)');
}

console.log('PWA icons generated in public/icons/ + public/favicon.ico');
