import { ImageResponse } from 'next/og';
import { NextResponse } from 'next/server';

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
  const markSize = Math.round(Math.min(width, height) * 0.22);
  const strokeSize = Math.round(markSize * (68 / 120));
  const radius = Math.round(markSize * (28 / 120));
  const borderWidth = Math.max(3, Math.round(markSize / 40));

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #ecfdf5 0%, #f8faf8 55%, #eff6ff 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: markSize,
          height: markSize,
          borderRadius: radius,
          background: 'rgba(16, 185, 129, 0.12)',
          border: `${borderWidth}px solid rgba(16, 185, 129, 0.35)`,
        }}
      >
        <svg fill="none" height={strokeSize} viewBox="0 0 24 24" width={strokeSize}>
          <path
            d="M22 12h-4l-3 9L9 3l-3 9H2"
            stroke="#059669"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={Math.max(2, Math.round(markSize / 60))}
          />
        </svg>
      </div>
    </div>,
    { width, height },
  );
}
