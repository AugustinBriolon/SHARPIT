import type { ThresholdChangeDirection, ThresholdField } from '@/lib/threshold/threshold-estimates';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { StaggerItem } from '@/components/motion/stagger-list';
import { cn } from '@/lib/utils';

export const DIRECTION_META: Record<
  ThresholdChangeDirection,
  { label: string; Icon: typeof TrendingUp; className: string }
> = {
  up: {
    label: 'Hausse',
    Icon: TrendingUp,
    className: 'text-chart-4 bg-chart-4/10',
  },
  down: {
    label: 'Baisse',
    Icon: TrendingDown,
    className: 'text-chart-3 bg-chart-3/10',
  },
  set: {
    label: 'Nouveau',
    Icon: Minus,
    className: 'text-muted-foreground bg-muted/60',
  },
};

export function ThresholdChangeRow({
  change,
  disabled,
  isAccepted,
  pending,
  onToggle,
}: {
  change: {
    field: ThresholdField;
    direction: ThresholdChangeDirection;
    label: string;
    from: string;
    to: string;
  };
  disabled: boolean;
  isAccepted: boolean;
  pending: boolean;
  onToggle: (field: ThresholdField) => void;
}) {
  const meta = DIRECTION_META[change.direction];
  const { Icon } = meta;

  return (
    <StaggerItem>
      <div
        className={cn(
          'bg-muted/25 rounded-analysis flex items-center gap-3 px-2.5 py-2',
          'border-analysis-border/40 border transition-opacity',
          !isAccepted && 'opacity-50',
        )}
      >
        <Checkbox
          aria-label={`Appliquer ${change.label}`}
          checked={isAccepted}
          disabled={disabled || pending}
          onCheckedChange={() => onToggle(change.field)}
        />
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase',
            meta.className,
          )}
        >
          <Icon className="size-3" aria-hidden />
          {meta.label}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            {change.label}
          </p>
          <p className="text-data text-sm tabular-nums">
            <span className="text-muted-foreground">{change.from}</span>
            <span className="text-muted-foreground mx-1.5">→</span>
            <span className="text-foreground font-semibold">{change.to}</span>
          </p>
        </div>
      </div>
    </StaggerItem>
  );
}
