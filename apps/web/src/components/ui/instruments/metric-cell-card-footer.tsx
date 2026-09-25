import type { CorpsTone } from '@/lib/ui/metric-tone';
import { isDeltaStatusTone } from '@/lib/health/health-status';
import { CORPS_TONE_TEXT } from '@/lib/ui/metric-tone';
import { cn } from '@/lib/utils';

export function MetricCellCardSub({ footer, sub }: { footer?: string; sub?: string }) {
  if (!sub) {
    return null;
  }
  return <p className={cn('text-foreground/80 mt-1 text-xs', footer && 'mt-1.5')}>{sub}</p>;
}

export function MetricCellCardFooterLine({
  footer,
  footerTone,
}: {
  footer?: string;
  footerTone?: CorpsTone;
}) {
  if (!footer) {
    return null;
  }
  return (
    <p
      className={cn(
        'mt-1 text-xs leading-snug',
        footerTone && isDeltaStatusTone(footerTone)
          ? CORPS_TONE_TEXT[footerTone]
          : 'text-muted-foreground',
      )}
    >
      {footer}
    </p>
  );
}

export function MetricCellCardExplain({
  explainLabel,
  onExplain,
}: {
  explainLabel: string;
  onExplain: () => void;
}) {
  return (
    <button
      aria-label={explainLabel}
      className="explore-link mt-3 self-start"
      type="button"
      onClick={onExplain}
    >
      comprendre
    </button>
  );
}
