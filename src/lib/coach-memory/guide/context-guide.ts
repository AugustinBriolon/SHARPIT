/**
 * Axes d'un bon contexte libre — pas des types structurés séparés.
 * Préférence / disponibilité vivent ici, pas dans COACH_MEMORY_FUTURE_TYPES.
 */
export const COACH_CONTEXT_GUIDE_AXES = [
  {
    id: 'availability',
    label: 'Disponibilités',
    hint: 'Jours, créneaux, durée max (ex. mardi midi ≤ 45 min).',
  },
  {
    id: 'preference',
    label: 'Préférences',
    hint: 'Sport, horaire favori, format de séance (ex. nage tôt le matin).',
  },
  {
    id: 'work',
    label: 'Contexte pro / vie',
    hint: 'Télétravail, charge, voyages récurrents qui changent la dispo.',
  },
  {
    id: 'limits',
    label: 'Limites',
    hint: 'Ce qu’il faut éviter ou ménager (blessure, fatigue, matériel).',
  },
] as const;

export type CoachContextGuideAxisId = (typeof COACH_CONTEXT_GUIDE_AXES)[number]['id'];
