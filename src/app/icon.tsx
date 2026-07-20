import { ImageResponse } from 'next/og';
import { BrandIconCanvas } from '@/lib/brand-icon-canvas';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(<BrandIconCanvas width={size.width} />, { ...size });
}
