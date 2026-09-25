import { cn } from '@/lib/utils';

export function SplitPaceDelta({
  delta,
  mode,
  refPaceSecPerKm,
}: {
  delta: { pct: number; faster: boolean } | null;
  mode: 'run' | 'bike';
  refPaceSecPerKm?: number | null;
}) {
  if (!delta || !refPaceSecPerKm || mode !== 'run') {
    return null;
  }
  return (
    <span className={cn('ml-1 text-[10px]', delta.faster ? 'text-primary' : 'text-signal-vo2')}>
      {delta.faster ? '−' : '+'}
      {delta.pct.toFixed(0)}%
    </span>
  );
}
