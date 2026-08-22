'use client';

import { MarkerCardGrid, type MarkerSpec } from '@/components/today/drill-down/marker-card-grid';
import { TWIN_DRILL_DOWN } from '@/lib/today/today-twin-navigation';

/** Adaptation has no daily series behind it, so these cards state and explain only. */
const EXPLANATION = {
  limiter:
    'La dimension qui freine le plus ton adaptation en ce moment, notée sur 100. Sous 40, c’est elle qui décide de ce que tu peux encaisser — travailler ailleurs ne débloquera rien.',
  load: 'Le coefficient appliqué à ton prochain bloc. Sous 1, le modèle réduit le volume pour laisser l’adaptation rattraper ; au-dessus, il ouvre la porte à plus de charge.',
} as const;

/**
 * Adaptation asks whether the training is working; records are the only observed
 * answer to that. The index is a model's opinion, a personal best is a fact.
 */
const RECORDS_ACTION = {
  label: 'Voir mes records',
  href: TWIN_DRILL_DOWN.records,
} as const;

/** 40/100 is the warn threshold the chips already used — same line, one place. */
const LIMITER_BAND = { low: 40, high: 100 } as const;
/** Anything inside ±5 % is the model saying "ne change rien". */
const LOAD_BAND = { low: 0.95, high: 1.05 } as const;

export function AdaptationMarkers({
  limitingFactor,
  limitingScore,
  loadMultiplier,
}: {
  limitingFactor: string | null;
  limitingScore: number | null;
  loadMultiplier: number;
}) {
  const specs: MarkerSpec[] = [
    {
      key: 'limiter',
      label: limitingFactor ?? 'Frein',
      unit: '/100',
      value: limitingScore != null ? Math.round(limitingScore) : null,
      points: [],
      range: { ...LIMITER_BAND, kind: 'baseline' },
      explanation: EXPLANATION.limiter,
      action: RECORDS_ACTION,
    },
    {
      key: 'load',
      label: 'Charge suivante',
      unit: '',
      value: loadMultiplier,
      points: [],
      range: { ...LOAD_BAND, kind: 'baseline' },
      explanation: EXPLANATION.load,
      format: (value) => (Math.abs(value - 1) < 0.005 ? 'Neutre' : `×${value.toFixed(2)}`),
    },
  ];

  return <MarkerCardGrid specs={specs} />;
}
