import type { ProductInsight, ProductInsightBundle } from '@/core/product-insight/types';

export type InsightNarrativeSection = {
  label: string;
  insights: ProductInsight[];
  emphasizeFirst?: boolean;
};

export function defaultInsightNarrativeSections(
  bundle: ProductInsightBundle,
): InsightNarrativeSection[] {
  return [
    { label: 'Pourquoi', insights: bundle.primary, emphasizeFirst: true },
    { label: 'Ce qui limite', insights: bundle.contextual },
    { label: 'Que faire', insights: bundle.supporting },
  ].filter((section) => section.insights.length > 0);
}

export function sleepInsightNarrativeSections(
  bundle: ProductInsightBundle,
): InsightNarrativeSection[] {
  return [
    {
      label: 'Pourquoi cette nuit compte',
      insights: bundle.primary.filter((insight) => insight.id === 'sleep:night-impact'),
      emphasizeFirst: true,
    },
    {
      label: 'Ce qui limite',
      insights: [...bundle.supporting, ...bundle.contextual],
    },
  ].filter((section) => section.insights.length > 0);
}
