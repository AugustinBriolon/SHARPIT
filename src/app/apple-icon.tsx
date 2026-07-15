import { ImageResponse } from 'next/og';

export const contentType = 'image/png';

// 180: default (iPhone). 167: iPad Pro. 152: iPad — cheap insurance given
// SHARPIT explicitly targets iPad as a real surface (docs/PWA_TESTING.md).
const SIZES = [
  { id: '180', width: 180, height: 180 },
  { id: '167', width: 167, height: 167 },
  { id: '152', width: 152, height: 152 },
] as const;

export function generateImageMetadata() {
  return SIZES.map(({ id, width, height }) => ({
    id,
    size: { width, height },
    contentType,
  }));
}

export default async function AppleIcon({ id }: { id: Promise<string> }) {
  const iconId = await id;
  const config = SIZES.find((s) => s.id === iconId) ?? SIZES[0];
  // Same proportions as the original 180 -> 120 (mark) -> 68 (stroke) design.
  const markSize = Math.round(config.width * (120 / 180));
  const strokeSize = Math.round(config.width * (68 / 180));
  const radius = Math.round(config.width * (28 / 180));

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
          border: '3px solid rgba(16, 185, 129, 0.35)',
        }}
      >
        <svg fill="none" height={strokeSize} viewBox="0 0 24 24" width={strokeSize}>
          <path
            d="M22 12h-4l-3 9L9 3l-3 9H2"
            stroke="#059669"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
        </svg>
      </div>
    </div>,
    { width: config.width, height: config.height },
  );
}
