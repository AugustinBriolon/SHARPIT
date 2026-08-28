import { cn } from '@/lib/utils';

export function ActivityHeaderMetricRow({
  label,
  value,
  onClick,
  onPointerEnter,
  className,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  onPointerEnter?: () => void;
  className?: string;
}) {
  const interactive = Boolean(onClick);

  if (interactive) {
    return (
      <button
        type="button"
        className={cn(
          'pressable flex min-h-9 w-full items-center justify-between gap-4 rounded-lg px-1 text-sm',
          className,
        )}
        onClick={onClick}
        onPointerEnter={onPointerEnter}
      >
        <span className="text-label text-muted-foreground">{label}</span>
        <span className="text-foreground text-data font-medium tabular-nums">{value}</span>
      </button>
    );
  }

  return (
    <div className={cn('flex min-h-9 items-center justify-between gap-4 text-sm', className)}>
      <span className="text-label text-muted-foreground">{label}</span>
      <span className="text-foreground text-data font-medium tabular-nums">{value}</span>
    </div>
  );
}
