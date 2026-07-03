'use client';

import { CircleHelp } from 'lucide-react';
import type { CorpsTone } from '@/components/corps/corps-ui';
import { cn } from '@/lib/utils';
import type { CompositionMetricId } from '@/lib/composition-metric-guides';

const TONE_DOT: Record<CorpsTone, string> = {
  good: 'bg-emerald-500',
  moderate: 'bg-amber-500',
  low: 'bg-red-500',
  neutral: 'bg-muted-foreground/40',
};

export function CompositionMetricCard({
  label,
  value,
  footer,
  tone = 'neutral',
  guideId,
  onExplain,
}: {
  label: string;
  value: string;
  footer?: string;
  tone?: CorpsTone;
  guideId?: CompositionMetricId;
  onExplain?: (id: CompositionMetricId) => void;
}) {
  return (
    <div className="group bg-background/40 hover:bg-background/60 relative flex flex-col rounded-xl border px-3.5 py-3 transition-colors">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className={cn('size-1.5 shrink-0 rounded-full', TONE_DOT[tone])} />
        <p className="text-muted-foreground truncate text-[10px] font-semibold tracking-[0.12em] uppercase">
          {label}
        </p>
      </div>
      <p className="mt-2 text-xl leading-none font-bold tabular-nums">{value}</p>
      {footer && <p className="text-muted-foreground mt-1.5 text-[10px] leading-snug">{footer}</p>}
      {guideId && onExplain && (
        <button
          aria-label={`Comprendre ${label}`}
          className="border-border/60 text-muted-foreground hover:border-primary/35 hover:bg-primary/5 hover:text-primary mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-1.5 text-[10px] font-medium transition-colors"
          type="button"
          onClick={() => onExplain(guideId)}
        >
          <CircleHelp className="size-3.5 shrink-0" />
          Comprendre cette mesure
        </button>
      )}
    </div>
  );
}
