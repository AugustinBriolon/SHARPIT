'use client';

import { MetricCell } from '@/components/ui/metric-cell';
import type { CorpsTone } from '@/lib/metric-tone';
import type { CompositionMetricId } from '@/lib/composition-metric-guides';

export function CompositionMetricCard({
  label,
  value,
  footer,
  footerTone,
  footerHint,
  tone = 'neutral',
  guideId,
  onExplain,
}: {
  label: string;
  value: string;
  footer?: string;
  footerTone?: CorpsTone;
  footerHint?: string;
  tone?: CorpsTone;
  guideId?: CompositionMetricId;
  onExplain?: (id: CompositionMetricId) => void;
}) {
  return (
    <MetricCell
      footer={footer}
      footerHint={footerHint}
      footerTone={footerTone}
      label={label}
      layout="card"
      tone={tone}
      value={value}
      showToneDot
      onExplain={guideId && onExplain ? () => onExplain(guideId) : undefined}
    />
  );
}
