import type { CorpsTone, MetricTone } from '@/lib/ui/metric-tone';
import { CORPS_TONE_TEXT } from '@/lib/ui/metric-tone';
import { MetricCellCard } from '@/components/ui/instruments/metric-cell-card';
import {
  MetricCellCompact,
  MetricCellStrip,
  resolveMetricValueClass,
} from '@/components/ui/instruments/metric-cell-layouts';

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
  const valueClass = resolveMetricValueClass(layout, tone, toneKey, CORPS_TONE_TEXT);

  if (layout === 'strip') {
    return (
      <MetricCellStrip
        label={label}
        loading={loading}
        sub={sub}
        value={value}
        valueClass={valueClass}
      />
    );
  }

  if (layout === 'compact') {
    return (
      <MetricCellCompact
        label={label}
        loading={loading}
        sub={sub}
        value={value}
        valueClass={valueClass}
      />
    );
  }

  return (
    <MetricCellCard
      explainLabel={explainLabel}
      footer={footer}
      footerHint={footerHint}
      footerTone={footerTone}
      label={label}
      loading={loading}
      showToneDot={showToneDot}
      sub={sub}
      toneKey={toneKey}
      value={value}
      valueClass={valueClass}
      onExplain={onExplain}
    />
  );
}
