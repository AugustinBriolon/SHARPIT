import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  accent?: 'primary' | 'cyan' | 'orange' | 'violet' | 'default';
  className?: string;
}

const accentTextMap = {
  primary: 'text-primary',
  cyan: 'text-cyan-600',
  orange: 'text-orange-600',
  violet: 'text-violet-600',
  default: 'text-foreground',
};

/**
 * Same shell as activity hero stats (Distance / Allure / …):
 * `border-border bg-card rounded-2xl border px-5 py-4`.
 */
export function MetricCard({
  label,
  value,
  sublabel,
  accent = 'default',
  className,
}: MetricCardProps) {
  return (
    <div className={cn('border-border bg-card rounded-2xl border px-5 py-4', className)}>
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
