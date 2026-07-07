import type { CorpsTone } from '@/lib/metric-tone';
import {
  CORPS_TONE_DOT,
  CORPS_TONE_TEXT,
  metricToneClass,
  type MetricTone,
} from '@/lib/metric-tone';
import { cn } from '@/lib/utils';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';

export type { MetricTone, CorpsTone };

export function MetricCell({
  label,
  value,
  sub,
  footer,
  tone = 'neutral',
  layout = 'strip',
  showToneDot = false,
  onExplain,
  explainLabel = 'Comprendre cette mesure',
}: {
  label: string;
  value: string;
  sub?: string;
  footer?: string;
  tone?: MetricTone | CorpsTone;
  layout?: 'strip' | 'card' | 'compact';
  showToneDot?: boolean;
  onExplain?: () => void;
  explainLabel?: string;
}) {
  const toneKey = tone as CorpsTone;
  const valueClass =
    layout === 'strip' || layout === 'compact'
      ? metricToneClass(tone as MetricTone)
      : CORPS_TONE_TEXT[toneKey];

  if (layout === 'strip') {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-3 py-4 text-center">
        <EyebrowLabel variant="metric">{label}</EyebrowLabel>
        <p className={cn('mt-1 text-base font-semibold tabular-nums lg:text-lg', valueClass)}>
          {value}
        </p>
        {sub && <p className="text-muted-foreground mt-0.5 text-[10px]">{sub}</p>}
      </div>
    );
  }

  if (layout === 'compact') {
    return (
      <div className="px-3 py-3">
        <EyebrowLabel variant="metric">{label}</EyebrowLabel>
        <p className={cn('mt-1 text-base font-semibold tabular-nums', valueClass)}>{value}</p>
        {sub && <p className="text-muted-foreground mt-0.5 text-[10px]">{sub}</p>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-col',
        onExplain
          ? 'group bg-background/40 hover:bg-background/60 rounded-xl border px-3.5 py-3 transition-colors'
          : 'bg-card/60 rounded-2xl border px-4 py-4',
      )}
    >
      <div className="flex items-center gap-2">
        {showToneDot && (
          <span className={cn('size-1.5 shrink-0 rounded-full', CORPS_TONE_DOT[toneKey])} />
        )}
        <EyebrowLabel
          className={onExplain ? 'truncate tracking-[0.12em]' : undefined}
          variant="metric"
        >
          {label}
        </EyebrowLabel>
      </div>
      <p
        className={cn(
          'mt-2 font-bold tabular-nums',
          onExplain ? 'text-xl leading-none' : 'text-2xl leading-none',
          valueClass,
        )}
      >
        {value}
      </p>
      {sub && <p className={cn('text-foreground/80 mt-1 text-xs', footer && 'mt-1.5')}>{sub}</p>}
      {footer && <p className="text-muted-foreground mt-1 text-[10px] leading-snug">{footer}</p>}
      {onExplain && (
        <button
          aria-label={explainLabel}
          className="border-border/60 text-muted-foreground hover:border-primary/35 hover:bg-primary/5 hover:text-primary mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-1.5 text-[10px] font-medium transition-colors"
          type="button"
          onClick={onExplain}
        >
          {explainLabel}
        </button>
      )}
    </div>
  );
}
