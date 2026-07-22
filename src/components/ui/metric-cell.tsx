import type { CorpsTone } from '@/lib/ui/metric-tone';
import { isDeltaStatusTone } from '@/lib/health/health-status';
import {
  CORPS_TONE_DOT,
  CORPS_TONE_TEXT,
  metricToneClass,
  type MetricTone,
} from '@/lib/ui/metric-tone';
import { cn } from '@/lib/utils';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';

export type { MetricTone, CorpsTone };

export function MetricCell({
  label,
  value,
  sub,
  footer,
  footerTone,
  footerHint,
  tone = 'neutral',
  layout = 'strip',
  loading = false,
  showToneDot = false,
  onExplain,
  explainLabel = 'Comprendre cette mesure',
}: {
  label: string;
  value: string;
  sub?: string;
  footer?: string;
  footerTone?: CorpsTone;
  footerHint?: string;
  tone?: MetricTone | CorpsTone;
  layout?: 'strip' | 'card' | 'compact';
  loading?: boolean;
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
      <div
        aria-busy={loading || undefined}
        className="flex min-w-0 flex-1 flex-col items-center justify-center px-3 py-4 text-center"
      >
        <EyebrowLabel variant="metric">{label}</EyebrowLabel>
        {loading ? (
          <div className="mt-1">
            <SkeletonDataValue heightClassName="h-5" widthClassName="w-10" />
          </div>
        ) : (
          <p className={cn('mt-1 text-base font-semibold tabular-nums lg:text-lg', valueClass)}>
            {value}
          </p>
        )}
        {loading ? (
          <div className="mt-1">
            <SkeletonDataValue heightClassName="h-2.5" widthClassName="w-14" />
          </div>
        ) : null}
        {!loading && sub ? <p className="text-muted-foreground mt-0.5 text-[10px]">{sub}</p> : null}
      </div>
    );
  }

  if (layout === 'compact') {
    return (
      <div aria-busy={loading || undefined} className="px-3 py-3">
        <EyebrowLabel variant="metric">{label}</EyebrowLabel>
        {loading ? (
          <div className="mt-1">
            <SkeletonDataValue heightClassName="h-5" widthClassName="w-10" />
          </div>
        ) : (
          <p className={cn('mt-1 text-base font-semibold tabular-nums', valueClass)}>{value}</p>
        )}
        {!loading && sub ? <p className="text-muted-foreground mt-0.5 text-[10px]">{sub}</p> : null}
      </div>
    );
  }

  return (
    <div
      aria-busy={loading || undefined}
      className={cn(
        'relative flex flex-col',
        onExplain
          ? 'group bg-analysis-surface-alt/70 hover:bg-analysis-surface border-analysis-border rounded-xl border px-3.5 py-3 transition-colors'
          : 'analysis-panel rounded-analysis px-4 py-4',
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
      {loading ? (
        <div className="mt-2">
          <SkeletonDataValue heightClassName="h-7" widthClassName="w-12" />
        </div>
      ) : (
        <p
          className={cn(
            'text-instrument mt-2',
            onExplain ? 'text-xl leading-none' : 'text-2xl leading-none',
            valueClass,
          )}
        >
          {value}
        </p>
      )}
      {loading ? (
        <div className="mt-1.5">
          <SkeletonDataValue heightClassName="h-3" widthClassName="w-20" />
        </div>
      ) : null}
      {!loading && sub ? (
        <p className={cn('text-foreground/80 mt-1 text-xs', footer && 'mt-1.5')}>{sub}</p>
      ) : null}
      {!loading && footer ? (
        <p
          className={cn(
            'mt-1 text-[10px] leading-snug',
            footerTone && isDeltaStatusTone(footerTone)
              ? CORPS_TONE_TEXT[footerTone]
              : 'text-muted-foreground',
          )}
        >
          {footer}
        </p>
      ) : null}
      {!loading && footerHint ? (
        <p className="text-muted-foreground mt-1 text-[9px] leading-snug">{footerHint}</p>
      ) : null}
      {!loading && onExplain ? (
        <button
          aria-label={explainLabel}
          className="explore-link mt-3 self-start"
          type="button"
          onClick={onExplain}
        >
          comprendre
        </button>
      ) : null}
    </div>
  );
}
