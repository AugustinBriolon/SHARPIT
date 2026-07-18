'use client';

import { AcwrZoneBar } from '@/components/effort/effort-acwr-section';
import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import {
  acwrZoneLabel,
  classifyAcwrZone,
  explainTsb,
  synthesizeLoadReading,
  tssGapToSweetSpotFloor,
} from '@/lib/effort/load-reading';
import { mapFatigueCapacityLabel, type TrainingCapacity } from '@/lib/today-mapping';
import { cn } from '@/lib/utils';

const DOMINANT_LABEL: Record<string, string> = {
  LOAD: 'Charge',
  NEUROMUSCULAR: 'Neuromusculaire',
  METABOLIC: 'Métabolique',
  CUMULATIVE: 'Chronique',
  PSYCHOLOGICAL: 'Psychologique',
  load: 'Charge',
  neuromuscular: 'Neuromusculaire',
  metabolic: 'Métabolique',
  cumulative: 'Chronique',
  psychological: 'Psychologique',
};

type FactRow = { label: string; value: string; hint: string };

/**
 * Load reading — directive + explained numbers (ACWR, gap TSS, TSB, capacity).
 * Replaces the old empty verdict / capacity / dominant / ACWR pile.
 */
export function EffortVerdictSection({
  verdict,
  verdictClass,
  verdictKey,
  trainingCapacity,
  dominantDimension,
  isLowFatigue,
  acwr,
  weeklyLoad,
  chronicWeeklyAvg,
  tsb,
}: {
  verdict: string;
  verdictClass: string;
  verdictKey: string;
  /** @deprecated unused — generic model slogans are not shown */
  rationale?: string[];
  trainingCapacity: TrainingCapacity;
  dominantDimension: string | null;
  isLowFatigue: boolean;
  acwr: number;
  weeklyLoad: number;
  chronicWeeklyAvg: number | null;
  tsb: number | null;
}) {
  const hasAcwr = acwr > 0;
  const zone = hasAcwr ? classifyAcwrZone(acwr) : null;
  const gap = tssGapToSweetSpotFloor(weeklyLoad, chronicWeeklyAvg);
  const synthesis = hasAcwr
    ? synthesizeLoadReading({
        verdictKey,
        acwr,
        weeklyLoad,
        chronicWeeklyAvg,
        tsb,
        trainingCapacity,
      })
    : null;
  const tsbLine = explainTsb(tsb);
  const systemLabel = dominantDimension
    ? (DOMINANT_LABEL[dominantDimension] ?? dominantDimension)
    : null;

  // ACWR lives in the rail header above — do not repeat it in the fact list.
  const facts: FactRow[] = [];
  if (weeklyLoad > 0) {
    facts.push({
      label: 'Charge 7j',
      value: `${weeklyLoad} TSS`,
      hint: chronicWeeklyAvg != null ? `base 42j ${chronicWeeklyAvg} TSS/sem` : 'charge aiguë',
    });
  }
  if (gap != null && zone === 'under' && gap > 0) {
    facts.push({
      label: 'Manque pour 0.9',
      value: `≈${gap} TSS`,
      hint: 'pour atteindre le plancher du sweet spot',
    });
  }
  if (tsb != null) {
    let tsbHint = 'forme positive';
    if (tsb < 0) tsbHint = 'forme négative';
    else if (tsb === 0) tsbHint = 'équilibre';
    facts.push({
      label: 'TSB',
      value: tsb > 0 ? `+${tsb}` : `${tsb}`,
      hint: tsbHint,
    });
  }
  facts.push({
    label: 'Capacité',
    value: mapFatigueCapacityLabel(trainingCapacity),
    hint: 'ce que le modèle autorise aujourd’hui',
  });
  if (systemLabel) {
    facts.push({
      label: isLowFatigue ? 'À surveiller' : 'Système dominant',
      value: systemLabel,
      hint: 'levier principal côté fatigue',
    });
  }

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Lecture de charge</DrillDownSectionLabel>

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-muted-foreground text-sm">Directive fatigue</p>
        <p className={cn('text-base font-semibold', verdictClass)}>{verdict}</p>
      </div>

      {hasAcwr && zone ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="text-label">ACWR</p>
              <p className="text-muted-foreground mt-1 text-[11px] leading-none">
                {acwrZoneLabel(zone)} · sweet spot 0.9–1.3
              </p>
            </div>
            <p className="text-data text-foreground text-2xl font-semibold tabular-nums">
              {acwr.toFixed(2)}
            </p>
          </div>
          <AcwrZoneBar acwr={acwr} />
        </div>
      ) : null}

      {synthesis ? (
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{synthesis}</p>
      ) : null}

      {facts.length > 0 ? (
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
      ) : null}

      {tsbLine && zone === 'under' ? <p className="annotation-clinical mt-4">{tsbLine}</p> : null}
    </DrillDownSectionCard>
  );
}
