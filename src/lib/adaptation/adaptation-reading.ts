/**
 * Presentation helpers for adaptation drill-down — numbers + meaning,
 * not generic rationale slogans.
 */

export function loadMultiplierDeltaPct(multiplier: number): number {
  return Math.round((multiplier - 1) * 100);
}

export function explainLoadMultiplier(multiplier: number): string | null {
  if (multiplier === 1) {
    return null;
  }
  const pct = loadMultiplierDeltaPct(multiplier);
  if (pct > 0) {
    return `×${multiplier.toFixed(2)} — viser environ +${pct} % de charge sur le prochain bloc.`;
  }
  return `×${multiplier.toFixed(2)} — réduire d’environ ${Math.abs(pct)} % la charge du prochain bloc.`;
}

function increaseLoadReading(input: {
  limitingFactor: string | null;
  limitingScore: number | null;
  plateauRisk: boolean;
  loadMultiplier: number;
  historyLength: number;
}): string {
  const { limitingFactor, limitingScore, plateauRisk, loadMultiplier, historyLength } = input;
  const histPart = historyLength > 0 ? ` Sur ${historyLength} j` : '';

  if (limitingFactor && limitingScore !== null) {
    return `Le frein (${limitingFactor.toLowerCase()} à ${limitingScore}/100)${
      plateauRisk ? ' et le plateau' : ''
    } bloquent la progression. Remonter la charge pour relancer l’adaptation${
      loadMultiplier !== 1 ? ` (cible ×${loadMultiplier.toFixed(2)})` : ''
    }.`;
  }
  return `${histPart.trim() ? `${histPart.trim()}. ` : ''}La progression de charge est insuffisante — augmenter pour sortir du palier.`;
}

function reduceLoadReading(verdictKey: string, overreachingWithoutAdaptation: boolean): string {
  if (verdictKey === 'REDUCE_LOAD' || overreachingWithoutAdaptation) {
    return 'Surcharge sans gain d’adaptation — baisser la charge pour laisser le corps absorber.';
  }
  return 'La récupération ne suit pas — prioriser la consolidation avant de remonter.';
}

function sustainAdaptationReading(historyLength: number): string {
  const histPart = historyLength > 0 ? ` Sur ${historyLength} j` : '';
  return `${histPart.trim() ? `${histPart.trim()} · ` : ''}Trajectoire productive — maintenir le rythme sans accélérer.`;
}

const ADAPTATION_VERDICT_READINGS: Record<
  string,
  (input: Parameters<typeof increaseLoadReading>[0]) => string
> = {
  INCREASE_LOAD: increaseLoadReading,
  REDUCE_LOAD: (input) => reduceLoadReading('REDUCE_LOAD', input.overreachingWithoutAdaptation),
  RECOVERY_PRIORITY: (input) =>
    reduceLoadReading('RECOVERY_PRIORITY', input.overreachingWithoutAdaptation),
  CONSOLIDATE: () => 'Consolider le niveau actuel avant la prochaine montée de charge.',
  SUSTAIN: (input) => sustainAdaptationReading(input.historyLength),
};

export function synthesizeAdaptationReading(input: {
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
}): string {
  const reading = ADAPTATION_VERDICT_READINGS[input.verdictKey]?.(input);
  if (reading) {
    return reading;
  }
  return input.historyLength > 0 ? ` Sur ${input.historyLength} j` : 'Lecture d’adaptation indisponible.';
}
