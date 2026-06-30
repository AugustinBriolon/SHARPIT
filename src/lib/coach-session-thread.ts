import type { SessionAnalysis } from '@/lib/validators/coach';
import { intensityLabels } from '@/lib/sessions';

const VERDICT_FR: Record<SessionAnalysis['verdict'], string> = {
  AS_PLANNED: 'conforme',
  HARDER: 'plus dur que prévu',
  EASIER: 'plus facile que prévu',
  SHORTER: 'plus court',
  LONGER: 'plus long',
  DIFFERENT: 'différent',
};

/** Message pour poursuivre une analyse de séance dans le chat coach. */
export function buildSessionDiscussPrompt(input: {
  title: string | null;
  sportLabel: string;
  analysis: SessionAnalysis;
  planned?: {
    durationMin?: number | null;
    description?: string | null;
    intensity?: string | null;
  };
  actual?: {
    title?: string | null;
    durationSec?: number | null;
    notes?: string | null;
  };
}): string {
  const name = input.title ?? input.sportLabel;
  const verdict = VERDICT_FR[input.analysis.verdict] ?? input.analysis.verdict;

  const plannedBits = [
    input.planned?.intensity
      ? `intensité ${intensityLabels[input.planned.intensity as keyof typeof intensityLabels] ?? input.planned.intensity}`
      : null,
    input.planned?.durationMin != null ? `${input.planned.durationMin} min` : null,
    input.planned?.description ? `consigne : ${input.planned.description}` : null,
  ].filter(Boolean);

  const actualBits = [
    input.actual?.title ? `« ${input.actual.title} »` : null,
    input.actual?.durationSec != null
      ? `${Math.round(input.actual.durationSec / 60)} min réalisées`
      : null,
    input.actual?.notes ? `notes : ${input.actual.notes}` : null,
  ].filter(Boolean);

  const context =
    plannedBits.length > 0 || actualBits.length > 0
      ? `\n\nContexte séance :\n- Prévu : ${plannedBits.join(' · ') || '—'}\n- Réalisé : ${actualBits.join(' · ') || '—'}`
      : '';

  const remarks =
    input.analysis.remarks.length > 0
      ? `\n\nPoints notables :\n${input.analysis.remarks.map((r) => `- ${r}`).join('\n')}`
      : '';
  const reco = input.analysis.recommendation
    ? `\n\nRecommandation : ${input.analysis.recommendation}`
    : '';

  return `Je viens de terminer ma séance « ${name} » (${input.sportLabel}). Voici l'analyse automatique (score ${input.analysis.complianceScore}/100 — ${verdict}) :

${input.analysis.summary}${context}${remarks}${reco}

J'aimerais en discuter avec toi : qu'est-ce que tu en retires pour la suite de ma semaine ?`;
}
