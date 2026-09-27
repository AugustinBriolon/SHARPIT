/**
 * The app icon for `next/og` ImageResponse (icon, apple-icon): the shared SVG from
 * `brand-icon.ts`, drawn as an image so every raster matches the iOS icon exactly.
 */
import { brandIconDataUri } from '@sharpit/app/lib/brand/brand-icon';

type BrandIconCanvasProps = {
  width: number;
  /** Corner radius; 0 for the square Apple touch icon, which iOS rounds itself. */
  outerRadius?: number;
};

export function BrandIconCanvas({
  width,
  outerRadius = Math.round(width * (112 / 512)),
}: BrandIconCanvasProps) {
  return (
    <img
      alt=""
      height={width}
      src={brandIconDataUri({ width, cornerRadius: outerRadius })}
      width={width}
    />
  );
}
