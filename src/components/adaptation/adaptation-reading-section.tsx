'use client';

import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { synthesizeAdaptationReading } from '@/lib/adaptation/adaptation-reading';
import { cn } from '@/lib/utils';

type FactRow = { label: string; value: string; hint: string };

/**
 * Single adaptation reading — merges former Verdict / Freins / Pourquoi blocks.
 * Numbers explained; no repeated slogans.
 */
export function AdaptationReadingSection({
  verdictLabel,
  verdictClassName,
  verdictKey,
  adaptationIndex,
  trendLabel,
  statusLabel,
  limitingFactor,
  limitingScore,
  plateauRisk,
  overreachingWithoutAdaptation,
  loadMultiplier,
  historyLength,
}: {
  verdictLabel: string;
  verdictClassName: string;
  verdictKey: string;
  adaptationIndex: number | null;
  trendLabel: string;
  statusLabel: string;
  limitingFactor: string | null;
  limitingScore: number | null;
  plateauRisk: boolean;
  overreachingWithoutAdaptation: boolean;
  loadMultiplier: number;
  historyLength: number;
}) {
  const synthesis = synthesizeAdaptationReading({
    verdictKey,
    adaptationIndex,
    trendLabel,
    statusLabel,
    limitingFactor,
    limitingScore,
    plateauRisk,
    overreachingWithoutAdaptation,
    loadMultiplier,
    historyLength,
  });

  const facts: FactRow[] = [
    {
      label: 'Indice',
      value: adaptationIndex != null ? `${Math.round(adaptationIndex)}` : '—',
      hint: statusLabel !== '—' ? statusLabel : 'score d’adaptation',
    },
    {
      label: 'Tendance',
      value: trendLabel,
      hint: historyLength > 0 ? `${historyLength} jours d’historique` : 'fenêtre récente',
    },
  ];

  if (limitingFactor) {
    facts.push({
      label: 'Frein principal',
      value: limitingScore != null ? `${Math.round(limitingScore)}` : '—',
      hint: limitingFactor,
    });
  }

  if (plateauRisk) {
    facts.push({
      label: 'Plateau',
      value: 'détecté',
      hint: 'adaptation qui stagne sur la fenêtre récente',
    });
  }

  if (overreachingWithoutAdaptation) {
    facts.push({
      label: 'Surcharge',
      value: 'sans gain',
      hint: 'charge haute sans réponse adaptative',
    });
  }

  if (loadMultiplier !== 1) {
    const pct = Math.round((loadMultiplier - 1) * 100);
    facts.push({
      label: 'Ajustement charge',
      value: `×${loadMultiplier.toFixed(2)}`,
      hint: pct > 0 ? `≈ +${pct} % sur le prochain bloc` : `≈ ${pct} % sur le prochain bloc`,
    });
  }

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Lecture d&apos;adaptation</DrillDownSectionLabel>

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-muted-foreground text-sm">Directive</p>
        <p className={cn('text-base font-semibold', verdictClassName)}>{verdictLabel}</p>
      </div>

      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{synthesis}</p>

      <ul className="divide-analysis-border/50 mt-4 divide-y">
        {facts.map((row) => (
          <li key={row.label} className="flex items-baseline justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium">{row.label}</p>
              <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">{row.hint}</p>
            </div>
            <p className="text-data text-foreground shrink-0 text-sm font-semibold tabular-nums">
              {row.value}
            </p>
          </li>
        ))}
      </ul>
    </DrillDownSectionCard>
  );
}
