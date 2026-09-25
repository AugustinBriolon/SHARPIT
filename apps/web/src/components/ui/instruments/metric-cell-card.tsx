import type { CorpsTone } from '@/lib/ui/metric-tone';
import { CORPS_TONE_DOT } from '@/lib/ui/metric-tone';
import { cn } from '@/lib/utils';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import {
  MetricCellCardExplain,
  MetricCellCardFooterLine,
  MetricCellCardSub,
} from '@/components/ui/instruments/metric-cell-card-footer';

function MetricCellCardFooter({
  explainLabel,
  footer,
  footerHint,
  footerTone,
  loading,
  onExplain,
  sub,
}: {
  explainLabel: string;
  footer?: string;
  footerHint?: string;
  footerTone?: CorpsTone;
  loading: boolean;
  onExplain?: () => void;
  sub?: string;
}) {
  if (loading) {
    return (
      <div className="mt-1.5">
        <SkeletonDataValue heightClassName="h-3" widthClassName="w-20" />
      </div>
    );
  }

  return (
    <>
      <MetricCellCardSub footer={footer} sub={sub} />
      <MetricCellCardFooterLine footer={footer} footerTone={footerTone} />
      {footerHint ? (
        <p className="text-muted-foreground mt-1 text-[9px] leading-snug">{footerHint}</p>
      ) : null}
      {onExplain ? (
        <MetricCellCardExplain explainLabel={explainLabel} onExplain={onExplain} />
      ) : null}
    </>
  );
}

export function MetricCellCard({
  explainLabel,
  footer,
  footerHint,
  footerTone,
  label,
  loading,
  onExplain,
  showToneDot,
  sub,
  toneKey,
  value,
  valueClass,
}: {
  explainLabel: string;
  footer?: string;
  footerHint?: string;
  footerTone?: CorpsTone;
  label: string;
  loading: boolean;
  onExplain?: () => void;
  showToneDot: boolean;
  sub?: string;
  toneKey: CorpsTone;
  value: string;
  valueClass: string;
}) {
  return (
    <div
      aria-busy={loading || undefined}
      className={cn(
        'relative flex flex-col',
        onExplain
          ? 'group chip-surface hover:border-primary/35 rounded-2xl px-3.5 py-3'
          : 'chip-surface rounded-2xl px-4 py-4',
      )}
    >
      <div className="flex items-center gap-2">
        {showToneDot ? (
          <span className={cn('size-1.5 shrink-0 rounded-full', CORPS_TONE_DOT[toneKey])} />
        ) : null}
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
      <MetricCellCardFooter
        explainLabel={explainLabel}
        footer={footer}
        footerHint={footerHint}
        footerTone={footerTone}
        loading={loading}
        sub={sub}
        onExplain={onExplain}
      />
    </div>
  );
}
