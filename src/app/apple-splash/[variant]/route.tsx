import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { BRAND_ICON_LIGHT, BRAND_ICON_PATH } from '@/lib/brand/brand-icon';

/**
 * iOS splash screens (`apple-touch-startup-image`) — not a Next.js special-file
 * convention (unlike icon/apple-icon), so this is a plain route generating the
 * PNG per device on request. One representative device per class from
 * docs/PWA_TESTING.md's own test matrix — not the full historical Apple device
 * chart, which includes hardware SHARPIT doesn't target testing on.
 *
 * Served via Sharp (Node) rather than `next/og` ImageResponse: full-device
 * splash dimensions (e.g. 1179×2556) exceed what `@vercel/og` reliably renders
 * in production, which previously 404'd these URLs.
 */
const SPLASH_VARIANTS = {
  'iphone-notch': { width: 1179, height: 2556 }, // iPhone 14/15/16 Pro-class, @3x
  'iphone-se': { width: 750, height: 1334 }, // iPhone SE, @2x
  'ipad-portrait': { width: 1640, height: 2360 }, // iPad Air/11" Pro-class, @2x
  'ipad-landscape': { width: 2360, height: 1640 },
} as const;

type SplashVariant = keyof typeof SPLASH_VARIANTS;

function isSplashVariant(value: string): value is SplashVariant {
  return value in SPLASH_VARIANTS;
}

export function generateStaticParams() {
  return Object.keys(SPLASH_VARIANTS).map((variant) => ({ variant }));
}

function splashSvg(width: number, height: number): Buffer {
  const shortSide = Math.min(width, height);
  const markSize = Math.round(shortSide * 0.22);
  const wellPad = Math.round(markSize * 0.125);
  const wellSize = markSize - wellPad * 2;
  const wellRx = Math.round(wellSize * 0.22);
  const strokePad = Math.round(wellSize * 0.22);
  const pathScale = (wellSize - strokePad * 2) / 24;
  const pathTx = (width - markSize) / 2 + wellPad + strokePad;
  const pathTy = (height - markSize) / 2 + wellPad + strokePad;
  const wellX = (width - markSize) / 2 + wellPad;
  const wellY = (height - markSize) / 2 + wellPad;
  const borderW = Math.max(2, Math.round(markSize / 80));
  const { canvasFlat, wellFill, wellBorder, stroke } = BRAND_ICON_LIGHT;

  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <rect width="${width}" height="${height}" fill="${canvasFlat}"/>
  <rect x="${wellX}" y="${wellY}" width="${wellSize}" height="${wellSize}" rx="${wellRx}" fill="${wellFill}" stroke="${wellBorder}" stroke-width="${borderW}"/>
  <g transform="translate(${pathTx} ${pathTy}) scale(${pathScale})">
    <path d="${BRAND_ICON_PATH}" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>`);
}

export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  if (!isSplashVariant(variant)) {
    return NextResponse.json({ error: 'Unknown splash variant' }, { status: 404 });
  }

  const { width, height } = SPLASH_VARIANTS[variant];
  const png = await sharp(splashSvg(width, height)).png().toBuffer();

  return new NextResponse(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
