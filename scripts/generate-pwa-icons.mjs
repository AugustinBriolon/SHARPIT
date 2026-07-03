/**
 * Génère les PNG PWA (manifest Android) à partir de public/favicon.svg.
 */
import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public/icons');
const svg = readFileSync(join(root, 'public/favicon.svg'));

mkdirSync(outDir, { recursive: true });

await Promise.all([
  sharp(svg).resize(192, 192).png().toFile(join(outDir, 'icon-192.png')),
  sharp(svg).resize(512, 512).png().toFile(join(outDir, 'icon-512.png')),
  sharp(svg).resize(512, 512).png().toFile(join(outDir, 'icon-512-maskable.png')),
]);

console.log('PWA icons generated in public/icons/');
