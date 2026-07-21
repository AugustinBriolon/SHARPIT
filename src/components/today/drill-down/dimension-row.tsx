import type { DimensionResult } from '@/hooks/use-today';
import {
  mapScoreToBarColorClass,
  mapScoreToBarColorClassProtective,
  mapScoreToColorClass,
  mapScoreToColorClassProtective,
} from '@/lib/today-mapping';
import { SkeletonDataValue, SkeletonInstrumentBar } from '@/components/ui/skeleton-data-value';
import { cn } from '@/lib/utils';

function resolveColorScore(
  available: boolean,
  score: number | null,
  higherIsWorse?: boolean,
): number | null {
  if (!available || score === null) return null;
  return higherIsWorse ? 100 - score : score;
}

export function DrillDownDimensionRow({
  label,
  description,
  dim,
  higherIsWorse,
  /** @deprecated use higherIsWorse */
  invertScore,
  intensityLabel,
  /** Soft caution for low scores — no punitive risk red. */
  protectiveTone = false,
  emphasized = false,
  loading = false,
}: {
  label: string;
  description: string;
  dim: DimensionResult;
  higherIsWorse?: boolean;
  invertScore?: boolean;
  intensityLabel?: string | null;
  protectiveTone?: boolean;
  emphasized?: boolean;
  loading?: boolean;
}) {
  const invert = higherIsWorse ?? invertScore;
  const { score, available } = dim;
  const colorScore = resolveColorScore(available, score, invert);

  let colorClass = 'text-muted-foreground/40';
  let barColorClass = 'bg-muted-foreground/10';
  if (colorScore !== null) {
    colorClass = protectiveTone
      ? mapScoreToColorClassProtective(colorScore)
      : mapScoreToColorClass(colorScore);
    barColorClass = protectiveTone
      ? mapScoreToBarColorClassProtective(colorScore)
      : mapScoreToBarColorClass(colorScore);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p
            className={cn(
              'text-sm font-medium',
              !loading && !available && 'text-muted-foreground/50',
            )}
          >
            {label}
            {emphasized ? (
              <span className="text-label text-muted-foreground ml-2 font-normal">frein</span>
            ) : null}
          </p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {loading ? (
            <SkeletonDataValue heightClassName="h-4" widthClassName="w-7" />
          ) : (
            <>
              {!available && (
                <span className="text-muted-foreground/40 text-xs">Signal manquant</span>
              )}
              {available && intensityLabel && (
                <span className={cn('text-xs font-medium tracking-wide uppercase', colorClass)}>
                  {intensityLabel}
                </span>
              )}
              <span className={cn('w-7 text-right text-sm font-bold tabular-nums', colorClass)}>
                {available && score !== null ? score : '—'}
              </span>
            </>
          )}
        </div>
      </div>
      {loading ? (
        <SkeletonInstrumentBar />
      ) : (
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColorClass)}
            style={{ width: available && score !== null ? `${score}%` : '0%' }}
          />
        </div>
      )}
    </div>
  );
}
