import { PhysioDomainWhy } from '@/components/today/drill-down/physio-domain-why';
import type { GlobalDecisionContext } from '@/core/presentation/global-decision-context';

/**
 * Effort why — load reading first; global decision in expand.
 */
export function EffortWhyBlock({
  verdict,
  verdictClass,
  acwr,
  tsb,
  globalDecision,
}: {
  verdict: string;
  verdictClass: string;
  acwr: number;
  tsb: number | null;
  globalDecision: GlobalDecisionContext;
}) {
  const parts: string[] = [];
  if (verdict) parts.push(verdict);
  if (acwr > 0) parts.push(`ACWR ${acwr.toFixed(2)}`);
  if (tsb != null) {
    const sign = tsb > 0 ? '+' : '';
    parts.push(`TSB ${sign}${tsb}`);
  }
  const primary = parts.length > 0 ? parts.join(' · ') : null;

  return (
    <PhysioDomainWhy
      globalDecision={globalDecision}
      label="Charge"
      primary={primary}
      primaryClassName={verdictClass}
    />
  );
}
