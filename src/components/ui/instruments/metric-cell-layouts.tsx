import type { CorpsTone, MetricTone } from '@/lib/ui/metric-tone';
import { metricToneClass } from '@/lib/ui/metric-tone';
import { cn } from '@/lib/utils';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';

export function MetricCellStrip({
  label,
  loading,
  sub,
  value,
  valueClass,
}: {
  label: string;
  loading: boolean;
  sub?: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div
      aria-busy={loading || undefined}
      className="flex min-w-0 flex-1 flex-col items-center justify-center px-3 py-4 text-center"
    >
      <EyebrowLabel variant="metric">{label}</EyebrowLabel>
      {loading ? (
        <div className="mt-1">
          <SkeletonDataValue heightClassName="h-5" widthClassName="w-10" />
        </div>
      ) : (
        <p className={cn('mt-1 text-base font-semibold tabular-nums lg:text-lg', valueClass)}>
          {value}
        </p>
      )}
      {loading ? (
        <div className="mt-1">
          <SkeletonDataValue heightClassName="h-2.5" widthClassName="w-14" />
        </div>
      ) : null}
      {!loading && sub ? <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p> : null}
    </div>
  );
}

export function MetricCellCompact({
  label,
  loading,
  sub,
  value,
  valueClass,
}: {
  label: string;
  loading: boolean;
  sub?: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div aria-busy={loading || undefined} className="px-3 py-3">
      <EyebrowLabel variant="metric">{label}</EyebrowLabel>
      {loading ? (
        <div className="mt-1">
          <SkeletonDataValue heightClassName="h-5" widthClassName="w-10" />
        </div>
      ) : (
        <p className={cn('mt-1 text-base font-semibold tabular-nums', valueClass)}>{value}</p>
      )}
      {!loading && sub ? <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p> : null}
    </div>
  );
}

export function resolveMetricValueClass(
  layout: 'strip' | 'card' | 'compact',
  tone: MetricTone | CorpsTone,
  toneKey: CorpsTone,
  toneText: Record<CorpsTone, string>,
) {
  if (layout === 'strip' || layout === 'compact') {
    return metricToneClass(tone as MetricTone);
  }
  return toneText[toneKey];
}
