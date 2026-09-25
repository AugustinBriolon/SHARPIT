/**
 * Shared SHARPIT app-icon mark — keep in sync with `scripts/generate-pwa-icons.mjs`
 * and `public/favicon*.svg`.
 *
 * Light: Snow / Warm Stone canvas, interactive primary stroke.
 * Dark: deep forest canvas, Lime Pulse stroke (readable on dark chrome).
 */
import { BRAND } from '@/lib/brand/brand-tokens';
import { THEME_DARK_COLOR } from '@/lib/theme/theme';

/** Lucide-style activity pulse path (viewBox 0 0 24 24). */
export const BRAND_ICON_PATH = 'M22 12h-4l-3 9L9 3l-3 9H2';

export const BRAND_ICON_LIGHT = {
  canvasStart: '#ecfdf5',
  canvasMid: BRAND.snowWhite,
  canvasEnd: BRAND.warmStone,
  /** Flat fill for maskable / ico (no gradient). */
  canvasFlat: BRAND.snowWhite,
  wellFill: 'rgba(211, 250, 153, 0.55)',
  wellBorder: 'rgba(47, 107, 40, 0.4)',
  stroke: BRAND.interactivePrimary,
} as const;

export const BRAND_ICON_DARK = {
  canvasStart: THEME_DARK_COLOR,
  canvasMid: '#15201c',
  canvasEnd: BRAND.forestDepths,
  canvasFlat: THEME_DARK_COLOR,
  wellFill: 'rgba(211, 250, 153, 0.18)',
  wellBorder: 'rgba(211, 250, 153, 0.45)',
  stroke: BRAND.limePulse,
} as const;

/** Maskable safe zone: mark fits in the centered 80% of the canvas. */
export const BRAND_ICON_MASKABLE_CONTENT_RATIO = 0.8;
