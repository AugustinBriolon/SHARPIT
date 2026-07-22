/**
 * Brand mark markup for `next/og` ImageResponse (icon, apple-icon, splash).
 * Colors from `brand-icon.ts` — not the old emerald/teal set.
 */
import { BRAND_ICON_LIGHT, BRAND_ICON_PATH } from '@/lib/brand/brand-icon';

type BrandIconCanvasProps = {
  width: number;
  /** Outer corner radius; 0 for full-bleed splash / square apple touch. */
  outerRadius?: number;
  /** Inner mark size as fraction of width (default ~0.625 ≈ 320/512). */
  markRatio?: number;
};

export function BrandIconCanvas({
  width,
  outerRadius = Math.round(width * (96 / 512)),
  markRatio = 320 / 512,
}: BrandIconCanvasProps) {
  const markSize = Math.round(width * markRatio);
  const strokeSize = Math.round(markSize * (180 / 320));
  const radius = Math.round(markSize * (72 / 320));
  const border = Math.max(2, Math.round(markSize / 80));
  const strokeWidth = Math.max(2, Math.round(markSize / 145));

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(145deg, ${BRAND_ICON_LIGHT.canvasStart} 0%, ${BRAND_ICON_LIGHT.canvasMid} 55%, ${BRAND_ICON_LIGHT.canvasEnd} 100%)`,
        borderRadius: outerRadius,
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
          background: BRAND_ICON_LIGHT.wellFill,
          border: `${border}px solid ${BRAND_ICON_LIGHT.wellBorder}`,
        }}
      >
        <svg fill="none" height={strokeSize} viewBox="0 0 24 24" width={strokeSize}>
          <path
            d={BRAND_ICON_PATH}
            stroke={BRAND_ICON_LIGHT.stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
          />
        </svg>
      </div>
    </div>
  );
}
