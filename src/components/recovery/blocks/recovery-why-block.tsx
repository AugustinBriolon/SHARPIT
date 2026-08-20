import { PhysioDomainWhy } from '@/components/today/drill-down/physio-domain-why';

/**
 * Recovery why — intensity / limiter first.
 */
export function RecoveryWhyBlock({
  intensityLabel,
  intensityClassName,
  limiterLabel,
  rationale,
  loading = false,
}: {
  intensityLabel: string;
  intensityClassName: string;
  limiterLabel: string | null;
  rationale: string[];
  loading?: boolean;
}) {
  if (loading) {
    return <PhysioDomainWhy label="État de récupération" primary={null} loading />;
  }

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
      label="État de récupération"
      primary={primary}
      primaryClassName={intensityClassName}
      supportingLines={rest}
    />
  );
}
