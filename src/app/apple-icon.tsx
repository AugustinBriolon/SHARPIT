import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
          width: 120,
          height: 120,
          borderRadius: 28,
          background: 'rgba(16, 185, 129, 0.12)',
          border: '3px solid rgba(16, 185, 129, 0.35)',
        }}
      >
        <svg fill="none" height="68" viewBox="0 0 24 24" width="68">
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
    { ...size },
  );
}
