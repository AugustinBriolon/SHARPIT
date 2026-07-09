'use client';

import type { ProductInsight } from '@/core/product-insight/types';
import type { InsightNarrativeSection } from '@/components/product-insight/narrative-sections';
import { cn } from '@/lib/utils';

function InsightBlock({ insight, emphasized }: { insight: ProductInsight; emphasized?: boolean }) {
  return (
    <article className={cn('space-y-2', emphasized && 'border-analysis-border border-l-2 pl-3')}>
      <p className={cn('text-sm leading-relaxed', emphasized ? 'text-foreground font-medium' : '')}>
        {insight.summary}
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed">{insight.explanation}</p>
      {insight.evidence.length > 0 ? (
        <ul className="text-muted-foreground space-y-1 text-sm leading-relaxed">
          {insight.evidence.map((line) => (
            <li key={`${insight.id}:${line}`}>· {line}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function NarrativeSection({ label, insights, emphasizeFirst = false }: InsightNarrativeSection) {
  if (insights.length === 0) return null;

  return (
    <section className="analysis-panel rounded-analysis-lg px-5 py-4 sm:px-6">
      <p className="text-label mb-3">{label}</p>
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div key={insight.id} className="space-y-1">
            {insights.length > 1 || !emphasizeFirst ? (
              <p className="text-foreground text-sm font-semibold">{insight.title}</p>
            ) : null}
            <InsightBlock emphasized={emphasizeFirst && index === 0} insight={insight} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function InsightNarrative({ sections }: { sections: InsightNarrativeSection[] }) {
  const visible = sections.filter((section) => section.insights.length > 0);
  if (visible.length === 0) return null;

  return (
    <div className="space-y-3">
      {visible.map((section) => (
        <NarrativeSection key={section.label} {...section} />
      ))}
    </div>
  );
}
