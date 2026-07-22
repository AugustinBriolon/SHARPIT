import { ImageResponse } from 'next/og';
import { BrandIconCanvas } from '@/lib/ui/brand-icon-canvas';

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

  return new ImageResponse(
    <BrandIconCanvas markRatio={120 / 180} outerRadius={0} width={config.width} />,
    { width: config.width, height: config.height },
  );
}
