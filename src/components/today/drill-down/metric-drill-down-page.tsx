import type { MetricTone } from '@/lib/metric-tone';
import { metricToneClass } from '@/lib/metric-tone';
import { cn } from '@/lib/utils';

export function MetricDrillDownPage({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto space-y-4 pb-8">
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
}: {
  confidencePct: number;
  dimensionCount: number;
  dimensionTotal: number;
  completenessLabel: string;
  className?: string;
}) {
  return (
    <p className={cn('text-muted-foreground text-center text-xs leading-relaxed', className)}>
      Fiabilité {confidencePct} % · {dimensionCount}/{dimensionTotal} dimensions · données{' '}
      {completenessLabel.toLowerCase()}
    </p>
  );
}

export type { MetricTone };
export { metricToneClass };
