import { PhysioDomainWhy } from '@/components/today/drill-down/physio-domain-why';
import type { GlobalDecisionContext } from '@/core/presentation/global-decision-context';
import { synthesizeAdaptationReading } from '@/lib/adaptation/adaptation-reading';

/**
 * Single adaptation narrative — synthesis first; global decision in expand.
 * Does not restate frein/tendance/indice already on plate + chips.
 */
export function AdaptationWhyBlock({
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
  globalDecision,
}: {
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
  globalDecision: GlobalDecisionContext;
}) {
  const primary = synthesizeAdaptationReading({
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

  const supporting: string[] = [];
  if (plateauRisk) {
    supporting.push('Plateau — adaptation qui stagne sur la fenêtre récente.');
  }
  if (overreachingWithoutAdaptation) {
    supporting.push('Surcharge sans gain — charge haute sans réponse adaptative.');
  }
  if (loadMultiplier !== 1) {
    const pct = Math.round((loadMultiplier - 1) * 100);
    supporting.push(
      pct > 0
        ? `Ajustement charge ×${loadMultiplier.toFixed(2)} (≈ +${pct} % sur le prochain bloc).`
        : `Ajustement charge ×${loadMultiplier.toFixed(2)} (≈ ${pct} % sur le prochain bloc).`,
    );
  }
  if (historyLength > 0) {
    supporting.push(`Fenêtre d’historique · ${historyLength} jours.`);
  }

  return (
    <PhysioDomainWhy
      globalDecision={globalDecision}
      label="Cette trajectoire"
      primary={primary}
      supportingLines={supporting}
    />
  );
}
