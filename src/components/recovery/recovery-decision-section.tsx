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
      label="Intensité recommandée"
      title={intensityLabel}
      titleClassName={intensityClassName}
    />
  );
}
