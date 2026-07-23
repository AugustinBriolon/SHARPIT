import { PhysioDomainWhy } from '@/components/today/drill-down/physio-domain-why';

/**
 * Effort why — load reading first.
 */
export function EffortWhyBlock({
  verdict,
  verdictClass,
  acwr,
  tsb,
  loading = false,
}: {
  verdict: string;
  verdictClass: string;
  acwr: number;
  tsb: number | null;
  loading?: boolean;
}) {
  if (loading) {
    return <PhysioDomainWhy label="Charge" primary={null} loading />;
  }

  const parts: string[] = [];
  if (verdict) parts.push(verdict);
  if (acwr > 0) parts.push(`ACWR ${acwr.toFixed(2)}`);
  if (tsb != null) {
    const sign = tsb > 0 ? '+' : '';
    parts.push(`TSB ${sign}${tsb}`);
  }
  const primary = parts.length > 0 ? parts.join(' · ') : null;

  return <PhysioDomainWhy label="Charge" primary={primary} primaryClassName={verdictClass} />;
}
