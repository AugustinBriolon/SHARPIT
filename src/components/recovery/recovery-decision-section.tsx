import { DrillDownHighlightSection } from '@/components/today/drill-down/highlight-section';

export function RecoveryDecisionSection({
  intensityLabel,
  intensityClassName,
  rationale,
}: {
  intensityLabel: string;
  intensityClassName: string;
  rationale: string[];
}) {
  return (
    <DrillDownHighlightSection
      bullets={rationale}
      description="Le niveau d'effort le plus réaliste compte tenu de ton état du jour."
      label="Verdict récupération"
      title={intensityLabel}
      titleClassName={intensityClassName}
    />
  );
}
