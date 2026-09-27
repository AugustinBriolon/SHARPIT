/**
 * Generates every raster icon the web ships from the app icon's mark (`brand-icon.ts`):
 *
 * - public/favicon.svg, public/favicon-dark.svg: the tab icon, light and dark
 * - public/icons/icon-192, icon-512: "any" icons
 * - public/icons/icon-512-maskable: full-bleed canvas, the mark inside the 80% safe zone
 * - favicon.ico (16 + 32, PNG-in-ICO): web's public/ and app/, and the hub's app/
 */
import sharp from 'sharp';
import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BRAND_ICON_MARK_RATIO,
  BRAND_ICON_MASKABLE_CONTENT_RATIO,
  brandIconSvg,
} from '@sharpit/app/lib/brand/brand-icon';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const iconsDir = join(publicDir, 'icons');
mkdirSync(iconsDir, { recursive: true });

/** The rounded tab icon; the mark a little larger than on the app icon so it reads at 16 px. */
const tabIcon = (canvas: 'light' | 'dark') => brandIconSvg({ width: 64, cornerRadius: 14, markRatio: 0.7, canvas });
const appIcon = (width: number) => brandIconSvg({ width, cornerRadius: Math.round(width * (112 / 512)) });
const maskable = (width: number) =>
  brandIconSvg({ width, markRatio: BRAND_ICON_MARK_RATIO * BRAND_ICON_MASKABLE_CONTENT_RATIO });

writeFileSync(join(publicDir, 'favicon.svg'), tabIcon('light'));
writeFileSync(join(publicDir, 'favicon-dark.svg'), tabIcon('dark'));

await Promise.all([
  sharp(Buffer.from(appIcon(192))).png().toFile(join(iconsDir, 'icon-192.png')),
  sharp(Buffer.from(appIcon(512))).png().toFile(join(iconsDir, 'icon-512.png')),
  sharp(Buffer.from(maskable(512))).png().toFile(join(iconsDir, 'icon-512-maskable.png')),
]);

/** An ICO whose entries are PNGs, which every current browser reads. */
function ico(pngs: { buffer: Buffer; size: number }[]): Buffer {
  const header = Buffer.alloc(6 + pngs.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ buffer, size }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(buffer.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += buffer.length;
  });
  return Buffer.concat([header, ...pngs.map((png) => png.buffer)]);
}

const favicon = ico(
  await Promise.all(
    [16, 32].map(async (size) => ({
      size,
      buffer: await sharp(Buffer.from(tabIcon('light'))).resize(size, size).png().toBuffer(),
    })),
  ),
);
for (const target of [
  join(publicDir, 'favicon.ico'),
  join(root, 'src/app/favicon.ico'),
  join(root, '../hub/src/app/favicon.ico'),
]) {
  writeFileSync(target, favicon);
}

console.log('Icons generated: favicons (web + hub), public/icons/');
