/**
 * Athlete equipment catalog — capability inventory for session generation.
 * Only items that change what SHARPIT can prescribe belong here.
 */

export const EQUIPMENT_SPORTS = ['RUN', 'BIKE', 'SWIM', 'STRENGTH', 'MOBILITY'] as const;
export type EquipmentSport = (typeof EQUIPMENT_SPORTS)[number];

export const STRENGTH_VENUES = ['gym', 'home', 'both', 'bodyweight'] as const;
export type StrengthVenue = (typeof STRENGTH_VENUES)[number];

export const EQUIPMENT_ITEM_IDS = [
  'run_treadmill',
  'run_track',
  'run_trail',
  'bike_home_trainer',
  'bike_power_meter',
  'bike_outdoor',
  'swim_pool',
  'swim_fins',
  'swim_paddles',
  'swim_pull_buoy',
  'strength_dumbbells',
  'strength_barbell',
  'strength_bench',
  'strength_pullup_bar',
  'strength_bands',
  'strength_trx',
  'mobility_foam_roller',
  'mobility_bands',
  'mobility_tennis_ball',
] as const;

export type EquipmentItemId = (typeof EQUIPMENT_ITEM_IDS)[number];

export type EquipmentCatalogItem = {
  id: EquipmentItemId;
  sport: EquipmentSport;
  label: string;
  /** Why this capability matters for session generation. */
  impact: string;
  /** Home strength items are only relevant when training at home. */
  requiresStrengthVenue?: ReadonlyArray<'home' | 'both'>;
};

export const EQUIPMENT_SPORT_LABELS: Record<EquipmentSport, string> = {
  RUN: 'Course',
  BIKE: 'Vélo',
  SWIM: 'Natation',
  STRENGTH: 'Musculation',
  MOBILITY: 'Mobilité',
};

export const STRENGTH_VENUE_OPTIONS: {
  id: StrengthVenue;
  title: string;
  description: string;
}[] = [
  {
    id: 'gym',
    title: 'Salle',
    description: 'Inscription salle — accès machines, racks et câbles sans inventaire.',
  },
  {
    id: 'home',
    title: 'Maison',
    description: 'Matériel à domicile uniquement — précise ce que tu as vraiment.',
  },
  {
    id: 'both',
    title: 'Les deux',
    description: 'Salle + matériel maison pour les jours sans déplacement.',
  },
  {
    id: 'bodyweight',
    title: 'Poids du corps',
    description: 'Aucun matériel de charge — séances au poids du corps.',
  },
];

export const EQUIPMENT_CATALOG: readonly EquipmentCatalogItem[] = [
  {
    id: 'run_treadmill',
    sport: 'RUN',
    label: 'Tapis de course',
    impact: 'Séances indoor structurées par mauvais temps ou le soir.',
  },
  {
    id: 'run_track',
    sport: 'RUN',
    label: 'Accès piste',
    impact: 'Fractions chronométrées et travail de vitesse précis.',
  },
  {
    id: 'run_trail',
    sport: 'RUN',
    label: 'Trail possible',
    impact: 'Séances dénivelé et terrain technique.',
  },
  {
    id: 'bike_home_trainer',
    sport: 'BIKE',
    label: 'Home trainer',
    impact: 'Séances indoor structurées (pluie, soir, plan B météo).',
  },
  {
    id: 'bike_power_meter',
    sport: 'BIKE',
    label: 'Capteur de puissance',
    impact: 'Prescriptions précises en watts.',
  },
  {
    id: 'bike_outdoor',
    sport: 'BIKE',
    label: 'Vélo outdoor',
    impact: 'Sorties route ou endurance longue dehors.',
  },
  {
    id: 'swim_pool',
    sport: 'SWIM',
    label: 'Accès piscine',
    impact: 'Séances natation structurées.',
  },
  {
    id: 'swim_fins',
    sport: 'SWIM',
    label: 'Palmes',
    impact: 'Travail technique jambes et endurance spécifique.',
  },
  {
    id: 'swim_paddles',
    sport: 'SWIM',
    label: 'Plaquettes',
    impact: 'Renforcement bras et technique de traction.',
  },
  {
    id: 'swim_pull_buoy',
    sport: 'SWIM',
    label: 'Pull buoy',
    impact: 'Focus haut du corps sans battements.',
  },
  {
    id: 'strength_dumbbells',
    sport: 'STRENGTH',
    label: 'Haltères / kettlebell',
    impact: 'Charge libre à domicile pour le renfo.',
    requiresStrengthVenue: ['home', 'both'],
  },
  {
    id: 'strength_barbell',
    sport: 'STRENGTH',
    label: 'Barre + disques',
    impact: 'Mouvements composés chargés à domicile.',
    requiresStrengthVenue: ['home', 'both'],
  },
  {
    id: 'strength_bench',
    sport: 'STRENGTH',
    label: 'Banc',
    impact: 'Développés et variations allongées.',
    requiresStrengthVenue: ['home', 'both'],
  },
  {
    id: 'strength_pullup_bar',
    sport: 'STRENGTH',
    label: 'Barre de traction',
    impact: 'Tractions et gainage vertical.',
    requiresStrengthVenue: ['home', 'both'],
  },
  {
    id: 'strength_bands',
    sport: 'STRENGTH',
    label: 'Élastiques',
    impact: 'Activation, assistance et charge progressive.',
    requiresStrengthVenue: ['home', 'both'],
  },
  {
    id: 'strength_trx',
    sport: 'STRENGTH',
    label: 'TRX / sangles',
    impact: 'Renfo en suspension au poids du corps.',
    requiresStrengthVenue: ['home', 'both'],
  },
  {
    id: 'mobility_foam_roller',
    sport: 'MOBILITY',
    label: 'Foam roller / stick',
    impact: 'Récupération et mobilité ciblée.',
  },
  {
    id: 'mobility_bands',
    sport: 'MOBILITY',
    label: 'Élastiques mobilité',
    impact: 'Épaules, hanches et activation douce.',
  },
  {
    id: 'mobility_tennis_ball',
    sport: 'MOBILITY',
    label: 'Balle de tennis / massage',
    impact: 'Points gâchettes, pieds, fessiers — travail localisé.',
  },
] as const;

export function catalogItemsForSport(
  sport: EquipmentSport,
  strengthVenue: StrengthVenue | null,
): EquipmentCatalogItem[] {
  return EQUIPMENT_CATALOG.filter((item) => {
    if (item.sport !== sport) return false;
    if (!item.requiresStrengthVenue) return true;
    if (strengthVenue == null) return false;
    return item.requiresStrengthVenue.includes(strengthVenue as 'home' | 'both');
  });
}

export function isEquipmentItemId(value: string): value is EquipmentItemId {
  return (EQUIPMENT_ITEM_IDS as readonly string[]).includes(value);
}

export function isStrengthVenue(value: string): value is StrengthVenue {
  return (STRENGTH_VENUES as readonly string[]).includes(value);
}

export function isEquipmentSport(value: string): value is EquipmentSport {
  return (EQUIPMENT_SPORTS as readonly string[]).includes(value);
}
