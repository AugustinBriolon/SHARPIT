'use client';

import { Markdown } from '@/components/coach/markdown';
import type { CoachMessageBlock, CoachMetricItem } from '@/lib/coach-message-structure';
import { parseCoachMessage } from '@/lib/coach-message-structure';
import { cn } from '@/lib/utils';

function MetricValue({ value }: { value: string }) {
  if (/\d/.test(value)) {
    return <span className="text-data text-foreground font-medium tabular-nums">{value}</span>;
  }
  return <span className="text-foreground font-medium">{value}</span>;
}

function MetricGrid({ metrics }: { metrics: CoachMetricItem[] }) {
  const groups = new Map<string, CoachMetricItem[]>();
  for (const metric of metrics) {
    const key = metric.subsection ?? '';
    const bucket = groups.get(key) ?? [];
    bucket.push(metric);
    groups.set(key, bucket);
  }

  return (
    <div className="space-y-3">
      {[...groups.entries()].map(([subsection, items]) => (
        <div key={subsection || 'default'} className="space-y-2">
          {subsection ? <p className="text-label">{subsection}</p> : null}
          <dl className="grid gap-2 sm:grid-cols-2">
            {items.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="bg-background/40 rounded-analysis border-analysis-border/60 border px-2.5 py-2"
              >
                <dt className="text-muted-foreground text-[11px] leading-snug">{item.label}</dt>
                <dd className="mt-0.5 text-sm">
                  <MetricValue value={item.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function PhaseBlock({
  title,
  metrics,
  prose,
}: {
  title: string;
  metrics: CoachMetricItem[];
  prose?: string;
}) {
  return (
    <section className="analysis-panel rounded-analysis space-y-3 px-3.5 py-3.5">
      <h3 className="text-section-title">{title}</h3>
      {metrics.length > 0 ? <MetricGrid metrics={metrics} /> : null}
      {prose ? <Markdown variant="compact">{prose}</Markdown> : null}
    </section>
  );
}

function SynthesisBlock({
  title,
  metrics,
  prose,
}: {
  title: string;
  metrics: CoachMetricItem[];
  prose?: string;
}) {
  return (
    <section className="analysis-panel-alt rounded-analysis-lg space-y-3 px-3.5 py-3.5">
      <h3 className="text-section-title">{title}</h3>
      {metrics.length > 0 ? <MetricGrid metrics={metrics} /> : null}
      {prose ? <Markdown variant="compact">{prose}</Markdown> : null}
    </section>
  );
}

function renderBlock(block: CoachMessageBlock, index: number) {
  switch (block.type) {
    case 'phase':
      return (
        <PhaseBlock key={index} metrics={block.metrics} prose={block.prose} title={block.title} />
      );
    case 'synthesis':
      return (
        <SynthesisBlock
          key={index}
          metrics={block.metrics}
          prose={block.prose}
          title={block.title}
        />
      );
    case 'conversation':
      return (
        <p
          key={index}
          className="text-muted-foreground border-border/50 border-t pt-3 text-sm leading-relaxed"
        >
          {block.content}
        </p>
      );
    case 'prose':
      return <Markdown key={index}>{block.content}</Markdown>;
    default:
      return null;
  }
}

export function CoachMessage({ children }: { children: string }) {
  const blocks = parseCoachMessage(children);

  return (
    <div className={cn('space-y-3')}>{blocks.map((block, index) => renderBlock(block, index))}</div>
  );
}
