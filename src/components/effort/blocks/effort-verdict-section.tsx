'use client';

import { AcwrZoneBar } from '@/components/effort/blocks/effort-acwr-section';
import { acwrZoneLabel, classifyAcwrZone, tssGapToSweetSpotFloor } from '@/lib/effort/load-reading';
import { mapFatigueCapacityLabel, type TrainingCapacity } from '@/lib/today/today-mapping';

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
 * Primary evidence — montée (ACWR) in French; acronym only as secondary measure.
 */
export function EffortVerdictSection({
  trainingCapacity,
  dominantDimension,
  isLowFatigue,
  acwr,
  weeklyLoad,
  chronicWeeklyAvg,
}: {
  verdict?: string;
  verdictClass?: string;
  verdictKey?: string;
  rationale?: string[];
  trainingCapacity: TrainingCapacity;
  dominantDimension: string | null;
  isLowFatigue: boolean;
  acwr: number;
  weeklyLoad: number;
  chronicWeeklyAvg: number | null;
  tsb?: number | null;
}) {
  const hasAcwr = acwr > 0;
  const zone = hasAcwr ? classifyAcwrZone(acwr) : null;
  const gap = tssGapToSweetSpotFloor(weeklyLoad, chronicWeeklyAvg);
  const systemLabel = dominantDimension
    ? (DOMINANT_LABEL[dominantDimension] ?? dominantDimension)
    : null;

  const facts: FactRow[] = [];
  if (weeklyLoad > 0) {
    facts.push({
      label: 'Charge 7 j',
      value: `${weeklyLoad} TSS`,
      hint: chronicWeeklyAvg != null ? `base 42 j ${chronicWeeklyAvg} TSS/sem` : 'charge aiguë',
    });
  }
  if (gap != null && zone === 'under' && gap > 0) {
    facts.push({
      label: 'Marge restante',
      value: `≈${gap} TSS`,
      hint: 'pour rejoindre le plancher de la zone utile',
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

  const [primaryFact, ...restFacts] = facts;

  return (
    <section className="px-0.5">
      <p className="text-label mb-2">Montée de charge</p>

      {hasAcwr && zone ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium">{acwrZoneLabel(zone)}</p>
              <p className="text-muted-foreground mt-1 text-xs leading-none">Zone utile 0,9–1,3</p>
            </div>
            <p className="text-data text-foreground text-2xl font-semibold tabular-nums">
              {acwr.toFixed(2)}
            </p>
          </div>
          <AcwrZoneBar acwr={acwr} />
          <p className="text-muted-foreground text-[10px] tracking-wide">
            Ratio charge aiguë / chronique (ACWR)
          </p>
        </div>
      ) : null}

      {primaryFact ? (
        <p className="text-foreground mt-3 text-sm leading-relaxed">
          <span className="text-label mr-2">{primaryFact.label}</span>
          <span className="text-data tabular-nums">{primaryFact.value}</span>
          <span className="text-muted-foreground"> — {primaryFact.hint}</span>
        </p>
      ) : null}

      {restFacts.length > 0 ? (
        <details className="group mt-2">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none py-1.5 text-xs font-medium tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
            <span className="underline-offset-2 group-open:no-underline">
              {restFacts.length === 1
                ? 'Voir le détail'
                : `Voir ${restFacts.length} autres signaux`}
            </span>
          </summary>
          <ul className="text-muted-foreground mt-1 space-y-1.5 text-sm leading-relaxed">
            {restFacts.map((row) => (
              <li key={row.label}>
                <span className="text-foreground font-medium">{row.label}</span>
                {' · '}
                <span className="text-data tabular-nums">{row.value}</span>
                {' — '}
                {row.hint}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
