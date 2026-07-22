import { ImageResponse } from 'next/og';
import { NextResponse } from 'next/server';
import { BrandIconCanvas } from '@/lib/ui/brand-icon-canvas';

/**
 * iOS splash screens (`apple-touch-startup-image`) — not a Next.js special-file
 * convention (unlike icon/apple-icon), so this is a plain route generating the
 * PNG per device on request. One representative device per class from
 * docs/PWA_TESTING.md's own test matrix — not the full historical Apple device
 * chart, which includes hardware SHARPIT doesn't target testing on.
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

export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  if (!isSplashVariant(variant)) {
    return NextResponse.json({ error: 'Unknown splash variant' }, { status: 404 });
  }

  const { width, height } = SPLASH_VARIANTS[variant];
  const shortSide = Math.min(width, height);
  const markRatio = (shortSide * 0.22) / width;

  return new ImageResponse(
    <BrandIconCanvas markRatio={markRatio} outerRadius={0} width={width} />,
    { width, height },
  );
}
