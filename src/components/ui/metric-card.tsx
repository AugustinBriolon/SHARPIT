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

const accentBarMap = {
  primary: 'bg-primary',
  cyan: 'bg-cyan-600',
  orange: 'bg-orange-600',
  violet: 'bg-violet-600',
  default: 'bg-signal-neutral/40',
};

export function MetricCard({
  label,
  value,
  sublabel,
  accent = 'default',
  className,
}: MetricCardProps) {
  return (
    <div className={cn('surface-dense relative h-28 overflow-hidden', className)}>
      <div className={cn('absolute inset-x-0 top-0 h-[2px]', accentBarMap[accent])} aria-hidden />
      <p className="text-label">{label}</p>
      <p className={cn('text-instrument mt-2 text-2xl', accentTextMap[accent])}>{value}</p>
      {sublabel && <p className="text-muted-foreground mt-1 text-xs">{sublabel}</p>}
    </div>
  );
}
