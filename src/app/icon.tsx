import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #ecfdf5 0%, #f8faf8 55%, #eff6ff 100%)',
        borderRadius: 96,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 320,
          height: 320,
          borderRadius: 72,
          background: 'rgba(16, 185, 129, 0.12)',
          border: '4px solid rgba(16, 185, 129, 0.35)',
        }}
      >
        <svg fill="none" height="180" viewBox="0 0 24 24" width="180">
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
