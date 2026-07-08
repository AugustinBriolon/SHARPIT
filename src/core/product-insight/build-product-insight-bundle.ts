import type { ProductInsight, ProductInsightBundle } from '@/core/product-insight/types';

function byImportance(insight: ProductInsight): number {
  switch (insight.importance) {
    case 'CRITICAL':
      return 4;
    case 'HIGH':
      return 3;
    case 'MEDIUM':
      return 2;
    case 'LOW':
      return 1;
  }
}

function sortInsights(insights: ProductInsight[]): ProductInsight[] {
  return [...insights].sort((a, b) => {
    const importanceDelta = byImportance(b) - byImportance(a);
    if (importanceDelta !== 0) return importanceDelta;
    return b.confidence - a.confidence;
  });
}

export function buildProductInsightBundle(params: {
  primary?: ProductInsight[];
  supporting?: ProductInsight[];
  contextual?: ProductInsight[];
}): ProductInsightBundle {
  return {
    primary: sortInsights(params.primary ?? []),
    supporting: sortInsights(params.supporting ?? []),
    contextual: sortInsights(params.contextual ?? []),
  };
}
