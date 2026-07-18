'use client';

import Link from 'next/link';
import { PhysioRail } from '@/components/ui/physio-rail';
import {
  formatRadialValue,
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
  unavailableCaption,
}: {
  href: string;
  label: string;
  value: number | null;
  max: number;
  format: RadialScoreFormat;
  colorMode?: RadialColorMode;
  compact?: boolean;
  /** Shown under the label when value is null — never a fake score. */
  unavailableCaption?: string | null;
}) {
  const displayValue = formatRadialValue(value, format);
  const suffix = format === 'percent' && value !== null ? '%' : '';
  const fallbackText = unavailableCaption ?? 'Donnée indisponible';
  let reading = fallbackText;
  if (value !== null) {
    reading =
      format === 'strain'
        ? `Indice ${displayValue} sur ${max}`
        : `${displayValue}${suffix} sur ${max}`;
  }
  const valueClass =
    colorMode === 'strain' ? 'text-signal-threshold dark:text-signal-tempo' : 'text-foreground';

  return (
    <Link
      href={href}
      className={cn(
        'analysis-panel group hover:border-primary/35 hover:bg-analysis-surface-alt/60 focus-visible:ring-primary/35 rounded-analysis flex min-h-11 flex-col gap-3 px-3 py-3 transition-[border-color,background-color,transform] duration-200 ease-out focus-visible:ring-2 focus-visible:outline-hidden',
        compact ? 'py-3' : 'px-4 py-4',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label">{label}</p>
          <p className="text-foreground mt-1 text-sm leading-snug font-medium">{reading}</p>
        </div>
        <div className="shrink-0 text-right">
          <span
            className={cn(
              'text-instrument leading-none',
              compact ? 'text-xl' : 'text-2xl',
              valueClass,
            )}
          >
            {displayValue}
          </span>
          {suffix ? (
            <span className="text-data text-muted-foreground ml-0.5 text-xs">{suffix}</span>
          ) : null}
        </div>
      </div>
      <div className="space-y-2">
        <PhysioRail
          className="w-full"
          emphasis={colorMode === 'neutral' ? 'neutral' : 'auto'}
          max={max}
          size="slim"
          value={value}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="explore-link">lecture physiologique</span>
        </div>
      </div>
    </Link>
  );
}
