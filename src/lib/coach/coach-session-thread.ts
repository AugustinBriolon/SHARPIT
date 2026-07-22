import type { SessionAnalysis } from '@/lib/validators/coach';
import { intensityLabels } from '@/lib/planned-session/sessions';

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

J'aimerais en discuter avec toi. De quoi souhaites-tu qu'on parle pour mieux comprendre cette séance ?`;
}

/** Contexte coach pour une activité réalisée (avec ou sans séance planifiée liée). */
export function buildActivityDiscussPrompt(input: {
  title: string | null;
  sportLabel: string;
  date: Date;
  durationSec: number | null;
  load: number | null;
  rpe: number | null;
  notes: string | null;
  analysis?: SessionAnalysis | null;
  planned?: {
    title?: string | null;
    durationMin?: number | null;
    description?: string | null;
    intensity?: string | null;
  };
}): string {
  const name = input.title ?? input.sportLabel;
  const dateLabel = input.date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const actualBits = [
    dateLabel,
    input.durationSec != null ? `${Math.round(input.durationSec / 60)} min` : null,
    input.load != null ? `${Math.round(input.load)} TSS` : null,
    input.rpe != null ? `RPE ${input.rpe}/10` : null,
    input.notes ? `notes : ${input.notes}` : null,
  ].filter(Boolean);

  const plannedBits = input.planned
    ? [
        input.planned.title ? `« ${input.planned.title} »` : null,
        input.planned.durationMin != null ? `${input.planned.durationMin} min prévues` : null,
        input.planned.intensity
          ? `intensité ${intensityLabels[input.planned.intensity as keyof typeof intensityLabels] ?? input.planned.intensity}`
          : null,
        input.planned.description ? `consigne : ${input.planned.description}` : null,
      ].filter(Boolean)
    : [];

  const plannedBlock =
    plannedBits.length > 0 ? `\n\nSéance programmée liée :\n- ${plannedBits.join('\n- ')}` : '';

  if (input.analysis) {
    const verdict = VERDICT_FR[input.analysis.verdict] ?? input.analysis.verdict;
    const remarks =
      input.analysis.remarks.length > 0
        ? `\n\nPoints notables :\n${input.analysis.remarks.map((r) => `- ${r}`).join('\n')}`
        : '';
    const reco = input.analysis.recommendation
      ? `\n\nRecommandation : ${input.analysis.recommendation}`
      : '';

    return `Je consulte ma séance réalisée « ${name} » (${input.sportLabel}). Réalisé : ${actualBits.join(' · ') || '—'}.${plannedBlock}

Analyse automatique (score ${input.analysis.complianceScore}/100 — ${verdict}) :
${input.analysis.summary}${remarks}${reco}`;
  }

  return `Je consulte ma séance réalisée « ${name} » (${input.sportLabel}). Réalisé : ${actualBits.join(' · ') || '—'}.${plannedBlock}`;
}

/** Message pour discuter d'une séance planifiée (pas encore réalisée). */
export function buildPlannedSessionDiscussPrompt(input: {
  title: string | null;
  sportLabel: string;
  date: Date;
  startTime?: string | null;
  durationMin?: number | null;
  load?: number | null;
  intensity?: string | null;
  description?: string | null;
  exposureLabel?: string | null;
  locationLabel?: string | null;
}): string {
  const name = input.title?.trim() || input.sportLabel;
  const dateLabel = input.date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const when = input.startTime ? `${dateLabel} à ${input.startTime}` : dateLabel;

  const bits = [
    input.durationMin != null ? `${input.durationMin} min` : null,
    input.load != null ? `${Math.round(input.load)} TSS` : null,
    input.intensity
      ? `intensité ${intensityLabels[input.intensity as keyof typeof intensityLabels] ?? input.intensity}`
      : null,
    input.exposureLabel ? `lieu ${input.exposureLabel}` : null,
    input.locationLabel ? `endroit : ${input.locationLabel}` : null,
    input.description ? `consigne : ${input.description}` : null,
  ].filter(Boolean);

  const detail = bits.length > 0 ? `\n\nDétail :\n- ${bits.join('\n- ')}` : '';

  return `Je consulte ma séance prévue « ${name} » (${input.sportLabel}), prévue ${when}.${detail}

J'aimerais en discuter avec toi : cette séance est-elle adaptée à mon état actuel, et que devrais-je ajuster ?`;
}

const PLANNING_HORIZON_FR: Record<number, string> = {
  1: 'demain',
  3: 'les 3 prochains jours',
  7: 'les 7 prochains jours',
  14: 'les 14 prochains jours',
};

/** Message pour discuter de la projection du planning hebdomadaire. */
export function buildPlanningDiscussPrompt(input: {
  synthesisSentence: string;
  horizonDays: number;
  caution?: { label: string; body: string } | null;
}): string {
  const horizonLabel = PLANNING_HORIZON_FR[input.horizonDays] ?? `${input.horizonDays} jours`;
  const cautionBlock =
    input.caution != null ? `\n\n${input.caution.label}\n${input.caution.body}` : '';

  return `Je consulte mon planning sur ${horizonLabel}. Voici le conseil du coach :

${input.synthesisSentence}${cautionBlock}

J'aimerais en discuter avec toi : ce plan me convient-il, et que devrais-je ajuster ?`;
}
