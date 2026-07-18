/**
 * Presentation helpers for adaptation drill-down — numbers + meaning,
 * not generic rationale slogans.
 */

export function loadMultiplierDeltaPct(multiplier: number): number {
  return Math.round((multiplier - 1) * 100);
}

export function explainLoadMultiplier(multiplier: number): string | null {
  if (multiplier === 1) return null;
  const pct = loadMultiplierDeltaPct(multiplier);
  if (pct > 0) {
    return `×${multiplier.toFixed(2)} — viser environ +${pct} % de charge sur le prochain bloc.`;
  }
  return `×${multiplier.toFixed(2)} — réduire d’environ ${Math.abs(pct)} % la charge du prochain bloc.`;
}

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
  const {
    verdictKey,
    adaptationIndex,
    trendLabel,
    limitingFactor,
    limitingScore,
    plateauRisk,
    overreachingWithoutAdaptation,
    loadMultiplier,
    historyLength,
  } = input;

  const indexPart =
    adaptationIndex != null ? `Indice ${Math.round(adaptationIndex)}/100` : 'Indice indisponible';
  const trendPart = trendLabel !== '—' ? ` · tendance ${trendLabel.toLowerCase()}` : '';
  const histPart = historyLength > 0 ? ` sur ${historyLength} j` : '';

  if (verdictKey === 'INCREASE_LOAD') {
    if (limitingFactor && limitingScore != null) {
      return `${indexPart}${trendPart}. Frein principal : ${limitingFactor.toLowerCase()} (${limitingScore}/100)${
        plateauRisk ? ' — plateau détecté' : ''
      }. Remonter la charge pour relancer l’adaptation${
        loadMultiplier !== 1 ? ` (cible ×${loadMultiplier.toFixed(2)})` : ''
      }.`;
    }
    return `${indexPart}${trendPart}${histPart}. La progression de charge est insuffisante — augmenter pour sortir du palier.`;
  }

  if (verdictKey === 'REDUCE_LOAD' || verdictKey === 'RECOVERY_PRIORITY') {
    if (overreachingWithoutAdaptation) {
      return `${indexPart}${trendPart}. Surcharge sans gain d’adaptation — baisser la charge pour laisser le corps absorber.`;
    }
    return `${indexPart}${trendPart}. La récupération ne suit pas — prioriser la consolidation avant de remonter.`;
  }

  if (verdictKey === 'CONSOLIDATE') {
    return `${indexPart}${trendPart}. Consolider le niveau actuel avant la prochaine montée de charge.`;
  }

  if (verdictKey === 'SUSTAIN') {
    return `${indexPart}${trendPart}${histPart}. Trajectoire productive — maintenir le rythme sans accélérer.`;
  }

  return `${indexPart}${trendPart}${histPart}.`;
}
