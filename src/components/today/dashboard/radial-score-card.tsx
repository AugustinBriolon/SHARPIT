'use client';

import Link from 'next/link';
import { RadialRing } from '@/components/ui/radial-ring';
import {
  formatRadialValue,
  radialFillPercent,
  resolveRadialStrokeColor,
  type RadialColorMode,
  type RadialScoreFormat,
} from '@/lib/radial-gauge';
import { cn } from '@/lib/utils';

export type { RadialColorMode, RadialScoreFormat };

export function RadialScoreCard({
  href,
  label,
  value,
  max,
  format,
  colorMode = 'dynamic',
  compact = false,
}: {
  href: string;
  label: string;
  value: number | null;
  max: number;
  format: RadialScoreFormat;
  colorMode?: RadialColorMode;
  compact?: boolean;
}) {
  const ringSize = compact ? 72 : 88;
  const strokeWidth = compact ? 5 : 6;
  const strokeColor = resolveRadialStrokeColor(value, colorMode);
  const fillPercent = radialFillPercent(value, max);
  const displayValue = formatRadialValue(value, format);

  return (
    <Link
      href={href}
      className={cn(
        'group flex min-h-11 flex-col items-center px-2 py-3',
        compact ? 'py-3' : 'py-4 sm:px-3',
      )}
    >
      <div className="relative">
        <RadialRing
          fillPercent={fillPercent}
          size={ringSize}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          {format === 'percent' ? (
            <span className="inline-flex items-baseline gap-px">
              <span
                className={cn(
                  'leading-none font-semibold tabular-nums',
                  compact ? 'text-xl' : 'text-2xl',
                )}
              >
                {displayValue}
              </span>
              {value !== null && (
                <span className="text-[11px] font-medium text-neutral-400 sm:text-xs">%</span>
              )}
            </span>
          ) : (
            <span
              className={cn(
                'leading-none font-semibold tabular-nums',
                compact ? 'text-xl' : 'text-2xl',
              )}
            >
              {displayValue}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 text-center">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-neutral-500 uppercase">
          {label}{' '}
          <span className="inline-block translate-x-0 transition-transform duration-200 ease-out group-hover:translate-x-1">
            {'>'}
          </span>
        </p>
      </div>
    </Link>
  );
}
