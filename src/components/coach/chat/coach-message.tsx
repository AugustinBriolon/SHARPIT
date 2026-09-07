'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Markdown } from '@/components/coach/chat/markdown';
import type { CoachMessageBlock, CoachMetricItem } from '@/lib/coach/chat/coach-message-structure';
import { parseCoachMessage } from '@/lib/coach/chat/coach-message-structure';
import { cn } from '@/lib/utils';

const BLOCK_EASE = [0.23, 1, 0.32, 1] as const;
const BLOCK_STAGGER_S = 0.05;

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
        <div key={subsection || 'default'} className="space-y-1.5">
          {subsection ? <p className="text-label">{subsection}</p> : null}
          <dl className="space-y-1">
            {items.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="flex flex-wrap items-baseline gap-x-1.5 text-sm leading-relaxed"
              >
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="text-foreground m-0">
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

function SectionBlock({
  title,
  metrics,
  prose,
  streaming,
  titleClassName,
}: {
  title: string;
  metrics: CoachMetricItem[];
  prose?: string;
  streaming?: boolean;
  titleClassName: string;
}) {
  return (
    <section className="space-y-2">
      <h3 className={titleClassName}>{title}</h3>
      {metrics.length > 0 ? <MetricGrid metrics={metrics} /> : null}
      {prose ? (
        <Markdown streaming={streaming} variant="compact">
          {prose}
        </Markdown>
      ) : null}
    </section>
  );
}

function SettlingBlock({
  index,
  skipMotion,
  children,
}: {
  index: number;
  skipMotion: boolean;
  children: ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;
  if (skipMotion || reduce) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      initial={{ opacity: 0, transform: 'translateY(6px)' }}
      transition={{
        duration: 0.2,
        delay: Math.min(index * BLOCK_STAGGER_S, 0.2),
        ease: BLOCK_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}

function renderBlock(block: CoachMessageBlock, index: number, streaming = false) {
  switch (block.type) {
    case 'phase':
      return (
        <SectionBlock
          key={index}
          metrics={block.metrics}
          prose={block.prose}
          streaming={streaming}
          title={block.title}
          titleClassName="text-sm font-semibold"
        />
      );
    case 'synthesis':
      return (
        <SectionBlock
          key={index}
          metrics={block.metrics}
          prose={block.prose}
          streaming={streaming}
          title={block.title}
          titleClassName="text-label"
        />
      );
    case 'conversation':
      return (
        <Markdown key={index} streaming={streaming} variant="compact">
          {block.content}
        </Markdown>
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

/**
 * Streaming Text settle — blocks stagger in (40–60 ms) once the answer is
 * complete; the live streaming tail stays still to avoid flicker.
 */
export function CoachMessage({
  children,
  streaming = false,
}: {
  children: string;
  streaming?: boolean;
}) {
  const blocks = parseCoachMessage(children);

  return (
    <div className={cn('space-y-3 text-sm leading-relaxed')}>
      {blocks.map((block, index) => {
        const isLiveTail = streaming && index === blocks.length - 1;
        return (
          <SettlingBlock key={index} index={index} skipMotion={isLiveTail}>
            {renderBlock(block, index, isLiveTail)}
          </SettlingBlock>
        );
      })}
    </div>
  );
}
