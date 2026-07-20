import { PhysioDomainWhy } from '@/components/today/drill-down/physio-domain-why';
import type { GlobalDecisionContext } from '@/core/presentation/global-decision-context';

/**
 * Recovery why — intensity / limiter first; global decision in expand.
 */
export function RecoveryWhyBlock({
  intensityLabel,
  intensityClassName,
  limiterLabel,
  rationale,
  globalDecision,
}: {
  intensityLabel: string;
  intensityClassName: string;
  limiterLabel: string | null;
  rationale: string[];
  globalDecision: GlobalDecisionContext;
}) {
  const [firstReason, ...rest] = rationale;
  let primary: string | null = null;
  if (intensityLabel && firstReason) {
    primary = `${intensityLabel} — ${firstReason}`;
  } else if (intensityLabel && limiterLabel) {
    primary = `${intensityLabel} — limité par ${limiterLabel}`;
  } else if (intensityLabel) {
    primary = intensityLabel;
  } else if (limiterLabel) {
    primary = `Facteur limitant · ${limiterLabel}`;
  }

  return (
    <PhysioDomainWhy
      globalDecision={globalDecision}
      label="État de récupération"
      primary={primary}
      primaryClassName={intensityClassName}
      supportingLines={rest}
    />
  );
}
