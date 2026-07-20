import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  accent?: 'primary' | 'orange' | 'default';
  className?: string;
}

const accentTextMap = {
  primary: 'text-primary',
  orange: 'text-signal-vo2',
  default: 'text-foreground',
};

/** Seed analysis plate — same shell as Corps / Today instrument panels. */
export function MetricCard({
  label,
  value,
  sublabel,
  accent = 'default',
  className,
}: MetricCardProps) {
  return (
    <div className={cn('analysis-panel rounded-analysis-lg px-5 py-4', className)}>
      <p className="text-label">{label}</p>
      <p
        className={cn(
          'mt-1.5 font-mono text-3xl font-semibold tabular-nums',
          accentTextMap[accent],
        )}
      >
        {value}
      </p>
      {sublabel ? (
        <p className="text-muted-foreground mt-1 text-xs leading-snug">{sublabel}</p>
      ) : null}
    </div>
  );
}
