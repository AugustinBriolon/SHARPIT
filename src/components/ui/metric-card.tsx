import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  accent?: 'primary' | 'cyan' | 'orange' | 'violet' | 'default';
  className?: string;
}

const accentMap = {
  primary: 'text-primary',
  cyan: 'text-cyan-600',
  orange: 'text-orange-600',
  violet: 'text-violet-600',
  default: 'text-foreground',
};

export function MetricCard({
  label,
  value,
  sublabel,
  accent = 'default',
  className,
}: MetricCardProps) {
  return (
    <div className={cn('border-border bg-card h-28 rounded-xl border p-4', className)}>
      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{label}</p>
      <p className={cn('mt-2 font-mono text-2xl font-semibold tabular-nums', accentMap[accent])}>
        {value}
      </p>
      {sublabel && <p className="text-muted-foreground mt-1 text-xs">{sublabel}</p>}
    </div>
  );
}
