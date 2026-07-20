'use client';

import { RadialRing } from '@/components/ui/radial-ring';
import {
  formatRadialValue,
  radialFillPercent,
  resolveRadialStrokeColor,
  type RadialColorMode,
  type RadialScoreFormat,
} from '@/lib/radial-gauge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function ArcGauge({
  score,
  label,
  href,
  size = 72,
  strokeWidth = 5,
  max = 100,
  colorMode = 'dynamic',
  format = 'number',
  strokeColor,
  children,
}: {
  score: number | null;
  label?: string;
  href?: string;
  size?: number;
  strokeWidth?: number;
  max?: number;
  colorMode?: RadialColorMode;
  format?: RadialScoreFormat;
  /** Override arc stroke color (bypasses colorMode). */
  strokeColor?: string;
  children?: React.ReactNode;
}) {
  const fillPercent = radialFillPercent(score, max);
  const resolvedStrokeColor = strokeColor ?? resolveRadialStrokeColor(score, colorMode);

  function fontSize() {
    if (size >= 88) return 'text-2xl';
    if (size >= 64) return 'text-lg';
    if (size >= 48) return 'text-sm';
    return 'text-xs';
  }

  const center =
    children ??
    (format === 'percent' ? (
      <span className="inline-flex items-baseline gap-px">
        <span className={cn('leading-none font-bold tabular-nums', fontSize())}>
          {formatRadialValue(score, 'number')}
        </span>
        {score !== null && (
          <span className="text-muted-foreground text-[11px] font-medium sm:text-xs">%</span>
        )}
      </span>
    ) : (
      <span className={cn('leading-none font-bold tabular-nums', fontSize())}>
        {formatRadialValue(score, format)}
      </span>
    ));

  const content = (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <RadialRing
          fillPercent={fillPercent}
          size={size}
          strokeColor={resolvedStrokeColor}
          strokeWidth={strokeWidth}
        />
        <div className="absolute inset-0 flex items-center justify-center">{center}</div>
      </div>
      {label && (
        <span className="text-muted-foreground text-center text-[10px] font-medium">{label}</span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link className="transition-opacity hover:opacity-80" href={href}>
        {content}
      </Link>
    );
  }
  return content;
}
