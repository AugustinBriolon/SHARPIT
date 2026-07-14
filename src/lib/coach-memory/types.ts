/** Types extensibles pour la mémoire structurée du coach. */

/** Implémenté aujourd'hui via AthleteTravelContext. */
export type CoachMemoryType = 'TRAVEL';

/** Types prévus — pas encore de stockage dédié. */
export type CoachMemoryTypeFuture = 'PREFERENCE' | 'CONSTRAINT' | 'AVAILABILITY';

export type CoachMemorySource = 'USER' | 'COACH';

export type CoachMemoryEntry = {
  id: string;
  type: CoachMemoryType;
  source: CoachMemorySource;
  label: string | null;
  locationLabel: string | null;
  locationLat: number | null;
  locationLng: number | null;
  startDate: string;
  endDate: string;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TravelMemoryInput = {
  label?: string | null;
  locationLabel: string;
  locationLat?: number | null;
  locationLng?: number | null;
  startDate: Date;
  endDate: Date;
  note?: string | null;
  source?: CoachMemorySource;
  applyToPlannedSessions?: boolean;
};

export const COACH_MEMORY_TYPE_LABELS: Record<CoachMemoryType, string> = {
  TRAVEL: 'Déplacement / voyage',
};

export const COACH_MEMORY_SOURCE_LABELS: Record<CoachMemorySource, string> = {
  USER: 'Ajout manuel',
  COACH: 'Déduit du coach',
};

export function isCoachMemorySource(value: unknown): value is CoachMemorySource {
  return value === 'USER' || value === 'COACH';
}

/** Returns null when source is missing or unknown — never render an empty badge. */
export function coachMemorySourceLabel(source: unknown): string | null {
  if (!isCoachMemorySource(source)) return null;
  return COACH_MEMORY_SOURCE_LABELS[source];
}

export function coachMemoryTypeLabel(type: unknown): string | null {
  if (type !== 'TRAVEL') return null;
  return COACH_MEMORY_TYPE_LABELS.TRAVEL;
}

export const COACH_MEMORY_FUTURE_TYPES: {
  type: CoachMemoryTypeFuture;
  label: string;
  description: string;
}[] = [
  {
    type: 'PREFERENCE',
    label: 'Préférence',
    description: 'Habitudes d’entraînement, créneaux favoris, contraintes récurrentes.',
  },
  {
    type: 'CONSTRAINT',
    label: 'Contrainte',
    description: 'Indisponibilités ou limitations temporaires hors déplacement.',
  },
  {
    type: 'AVAILABILITY',
    label: 'Disponibilité',
    description: 'Plages horaires ou jours préférés pour planifier.',
  },
];
