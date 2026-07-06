import { DrillDownHighlightSection } from '@/components/today/drill-down/highlight-section';

const VERDICT_DESCRIPTION: Record<string, string> = {
  BUILD: 'La charge peut être augmentée pour stimuler les adaptations.',
  MAINTAIN: 'La charge actuelle est adaptée — ne pas augmenter ni réduire.',
  REDUCE: 'La fatigue dépasse la capacité de récupération — lever le pied.',
  REST_WEEK: 'La fatigue accumulée nécessite une semaine de décharge complète.',
  TAPER: 'Réduction progressive de la charge pour optimiser la forme en compétition.',
  INSUFFICIENT_DATA: 'Pas assez de données pour formuler une directive de charge.',
};

export function EffortVerdictSection({
  verdict,
  verdictClass,
  verdictKey,
  rationale,
}: {
  verdict: string;
  verdictClass: string;
  verdictKey: string;
  rationale: string[];
}) {
  const description = VERDICT_DESCRIPTION[verdictKey] ?? VERDICT_DESCRIPTION.INSUFFICIENT_DATA;

  return (
    <DrillDownHighlightSection
      bullets={rationale}
      description={description}
      label="Directive de charge"
      title={verdict}
      titleClassName={verdictClass}
    />
  );
}
