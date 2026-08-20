'use client';

import { Markdown } from '@/components/coach/chat/markdown';
import type { CoachMessageBlock, CoachMetricItem } from '@/lib/coach/chat/coach-message-structure';
import { parseCoachMessage } from '@/lib/coach/chat/coach-message-structure';
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
                <dt className="text-muted-foreground text-xs leading-snug">{item.label}</dt>
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
  streaming,
}: {
  title: string;
  metrics: CoachMetricItem[];
  prose?: string;
  streaming?: boolean;
}) {
  return (
    <section className="analysis-panel rounded-analysis space-y-3 px-3.5 py-3.5">
      <h3 className="text-section-title">{title}</h3>
      {metrics.length > 0 ? <MetricGrid metrics={metrics} /> : null}
      {prose ? (
        <Markdown streaming={streaming} variant="compact">
          {prose}
        </Markdown>
      ) : null}
    </section>
  );
}

function SynthesisBlock({
  title,
  metrics,
  prose,
  streaming,
}: {
  title: string;
  metrics: CoachMetricItem[];
  prose?: string;
  streaming?: boolean;
}) {
  return (
    <section className="analysis-panel-alt rounded-analysis-lg space-y-3 px-3.5 py-3.5">
      <h3 className="text-section-title">{title}</h3>
      {metrics.length > 0 ? <MetricGrid metrics={metrics} /> : null}
      {prose ? (
        <Markdown streaming={streaming} variant="compact">
          {prose}
        </Markdown>
      ) : null}
    </section>
  );
}

function renderBlock(block: CoachMessageBlock, index: number, streaming = false) {
  switch (block.type) {
    case 'phase':
      return (
        <PhaseBlock
          key={index}
          metrics={block.metrics}
          prose={block.prose}
          streaming={streaming}
          title={block.title}
        />
      );
    case 'synthesis':
      return (
        <SynthesisBlock
          key={index}
          metrics={block.metrics}
          prose={block.prose}
          streaming={streaming}
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
          {streaming && <span className="coach-streaming-caret" aria-hidden />}
        </p>
      );
    case 'prose':
      return (
        <Markdown key={index} streaming={streaming}>
          {block.content}
        </Markdown>
      );
    default:
      return null;
  }
}

export function CoachMessage({
  children,
  streaming = false,
}: {
  children: string;
  streaming?: boolean;
}) {
  const blocks = parseCoachMessage(children);

  return (
    <div className={cn('space-y-3')}>
      {blocks.map((block, index) =>
        renderBlock(block, index, streaming && index === blocks.length - 1),
      )}
    </div>
  );
}
