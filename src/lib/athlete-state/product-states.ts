import type { AthleteStateDomain, FreshnessLevel } from '@/core/athlete-state/freshness';

const MESSAGES: Record<FreshnessLevel, Partial<Record<AthleteStateDomain, string>>> = {
  fresh: {},
  stale: {
    recovery: 'Tes données ont changé — mise à jour de ta récupération en cours.',
    training: 'Nouvelle activité détectée — recalcul de ta charge.',
    sleep: 'Mise à jour de ton analyse de sommeil.',
    reasoning: 'Synthèse du jour en cours de mise à jour.',
  },
  awaiting_data: {
    sleep: 'Les données de sommeil de la nuit ne sont pas encore arrivées.',
    recovery: 'En attente des signaux de récupération (sommeil, VFC).',
    training: "La charge d'entraînement du jour n'a pas encore été mesurée.",
    body: 'Pas de nouvelle mesure corporelle récente.',
  },
  syncing: {
    recovery: 'Récupération de tes dernières données…',
    sleep: 'Récupération de tes données de sommeil…',
    training: 'Récupération de tes séances…',
    body: 'Récupération de tes mesures corporelles…',
    planning: 'Mise à jour de ton planning…',
  },
  computing: {
    recovery: 'Analyse de ta récupération…',
    training: 'Analyse de ta charge…',
    sleep: 'Analyse de ton sommeil…',
    physical: 'Analyse de ta condition physique…',
    reasoning: 'Synthèse de ton état du jour…',
    recommendations: 'Préparation de ton bilan…',
  },
  unavailable: {
    recovery: 'Données insuffisantes pour estimer ta récupération.',
    reasoning: 'Synthèse indisponible — synchronise tes appareils.',
  },
};

export function productMessageForDomain(
  domain: AthleteStateDomain,
  freshness: FreshnessLevel,
): string | null {
  if (freshness === 'fresh') return null;
  return MESSAGES[freshness][domain] ?? null;
}

export function pickPrimaryProductMessage(messages: Array<string | null>): string | null {
  return messages.find((m) => m != null) ?? null;
}
