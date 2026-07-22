import type { MetricTone } from '@/lib/ui/metric-tone';
import { metricToneClass } from '@/lib/ui/metric-tone';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { cn } from '@/lib/utils';

/**
 * Shared physio drill-down column.
 * Mobile: tighter iOS-like stack rhythm; desktop keeps airy analysis spacing.
 */
export function MetricDrillDownPage({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto space-y-3 pb-2 sm:space-y-4 sm:pb-8">
      {children}
      {footer}
    </div>
  );
}

export function DataReliabilityFooter({
  confidencePct,
  dimensionCount,
  dimensionTotal,
  completenessLabel,
  className,
  loading = false,
}: {
  confidencePct: number;
  dimensionCount: number;
  dimensionTotal: number;
  completenessLabel: string;
  className?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div
        className={cn(
          'text-muted-foreground flex items-center justify-center gap-1.5 text-center text-xs leading-relaxed',
          className,
        )}
        aria-busy
      >
        <span>Fiabilité</span>
        <SkeletonDataValue heightClassName="h-3" widthClassName="w-28" />
      </div>
    );
  }

  return (
    <p className={cn('text-muted-foreground text-center text-xs leading-relaxed', className)}>
      Fiabilité {confidencePct} % · {dimensionCount}/{dimensionTotal} dimensions · données{' '}
      {completenessLabel.toLowerCase()}
    </p>
  );
}

export type { MetricTone };
export { metricToneClass };
