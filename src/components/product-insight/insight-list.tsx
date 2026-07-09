'use client';

import type { ProductInsight } from '@/core/product-insight/types';
import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';

function impactLabel(value: ProductInsight['decisionImpact']): string {
  switch (value) {
    case 'TRAINING_TODAY':
      return "Décision d'aujourd'hui";
    case 'RECOVERY_BEHAVIOR':
      return 'Comportement de récupération';
    case 'LOAD_PROGRESSION':
      return 'Progression du bloc';
    case 'BODY_TRAJECTORY':
      return 'Trajectoire corporelle';
    case 'HEALTH_AWARENESS':
      return 'Contexte santé';
    case 'TRUST':
      return 'Confiance de lecture';
    case 'INFORMATIVE':
      return 'Information utile';
  }
}

function importanceClass(value: ProductInsight['importance']): string {
  switch (value) {
    case 'CRITICAL':
      return 'text-red-600';
    case 'HIGH':
      return 'text-amber-600';
    case 'MEDIUM':
      return 'text-blue-600';
    case 'LOW':
      return 'text-muted-foreground';
  }
}

export function InsightList({ label, insights }: { label: string; insights: ProductInsight[] }) {
  if (insights.length === 0) return null;

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>{label}</DrillDownSectionLabel>
      <div className="mt-4 space-y-4">
        {insights.map((insight) => (
          <article key={insight.id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{insight.title}</p>
              <span className={`text-xs font-medium ${importanceClass(insight.importance)}`}>
                {impactLabel(insight.decisionImpact)}
              </span>
              <span className="text-muted-foreground text-xs">
                {Math.round(insight.confidence * 100)} %
              </span>
            </div>
            <p className="text-sm font-medium">{insight.summary}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">{insight.explanation}</p>
            {insight.evidence.length > 0 ? (
              <ul className="text-muted-foreground space-y-1 text-sm leading-relaxed">
                {insight.evidence.map((line) => (
                  <li key={`${insight.id}:${line}`}>· {line}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </DrillDownSectionCard>
  );
}
