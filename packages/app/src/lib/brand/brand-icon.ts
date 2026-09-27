/**
 * The SHARPIT mark — the iOS app icon's (`SHARPIT-APP/SharpIt.icon`): six dots on a hexagon, lit
 * by a green gradient, on a white canvas that deepens to grey at the foot.
 *
 * One SVG builder serves every raster the web ships — favicons, PWA icons, the Apple touch icon
 * and the splash screens (`scripts/generate-pwa-icons.mts`, `app/icon.tsx`, `app/apple-icon.tsx`,
 * `app/apple-splash`) — and `BrandMark` in `@sharpit/ui` draws the same dots inline.
 */
import { THEME_DARK_COLOR } from '@sharpit/app/lib/theme/theme';

/** The glyph's own box and dots, measured from the icon's layer image. */
export const BRAND_MARK = {
  width: 1327,
  height: 1232,
  radius: 206,
  dots: [
    [434, 206.5],
    [891.5, 206.5],
    [206, 615],
    [1119.5, 615],
    [434, 1024],
    [891.5, 1024],
  ],
  /** The icon layer's gradient, top to bottom. */
  gradientTop: '#95ffb2',
  gradientBottom: '#37f486',
} as const;

export const BRAND_ICON_LIGHT = {
  canvasTop: '#ffffff',
  canvasBottom: '#e6e6e6',
} as const;

export const BRAND_ICON_DARK = {
  canvasTop: '#1c2621',
  canvasBottom: THEME_DARK_COLOR,
} as const;

/** The mark's width on the app icon, as Icon Composer places it (`scale: 0.59`). */
export const BRAND_ICON_MARK_RATIO = 0.59;
/** Maskable safe zone: the mark fits in the centered 80% of the canvas. */
export const BRAND_ICON_MASKABLE_CONTENT_RATIO = 0.8;

export type BrandIconOptions = {
  width: number;
  height?: number;
  /** Mark width as a fraction of the shorter side. */
  markRatio?: number;
  /** `none` draws the dots alone on a transparent ground. */
  canvas?: 'light' | 'dark' | 'none';
  /** Corner radius of the canvas; 0 for full-bleed. */
  cornerRadius?: number;
};

/** The dots, as SVG elements in the mark's own coordinates, filled with `fill`. */
export function brandMarkDots(fill: string): string {
  return BRAND_MARK.dots
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="${BRAND_MARK.radius}" fill="${fill}"/>`)
    .join('');
}

export function brandIconSvg({
  width,
  height = width,
  markRatio = BRAND_ICON_MARK_RATIO,
  canvas = 'light',
  cornerRadius = 0,
}: BrandIconOptions): string {
  const markWidth = Math.min(width, height) * markRatio;
  const scale = markWidth / BRAND_MARK.width;
  const x = (width - markWidth) / 2;
  const y = (height - BRAND_MARK.height * scale) / 2;
  const colors = canvas === 'dark' ? BRAND_ICON_DARK : BRAND_ICON_LIGHT;
  const background =
    canvas === 'none'
      ? ''
      : `<rect width="${width}" height="${height}" rx="${cornerRadius}" fill="url(#canvas)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="canvas" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${colors.canvasTop}"/>
      <stop offset="1" stop-color="${colors.canvasBottom}"/>
    </linearGradient>
    <linearGradient id="mark" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${BRAND_MARK.height}">
      <stop offset="0" stop-color="${BRAND_MARK.gradientTop}"/>
      <stop offset="1" stop-color="${BRAND_MARK.gradientBottom}"/>
    </linearGradient>
  </defs>
  ${background}
  <g transform="translate(${x} ${y}) scale(${scale})">${brandMarkDots('url(#mark)')}</g>
</svg>`;
}

/** The same SVG as a data URI, for `<img>` in `next/og` renders. */
export function brandIconDataUri(options: BrandIconOptions): string {
  return `data:image/svg+xml;base64,${Buffer.from(brandIconSvg(options)).toString('base64')}`;
}
