import type { EquipmentItemId, StrengthVenue } from '@/lib/equipment/catalog';

/** Persisted athlete equipment inventory (AthleteProfile.equipment). */
export type AthleteEquipment = {
  version: 1;
  strengthVenue: StrengthVenue | null;
  owned: EquipmentItemId[];
};

export const EMPTY_ATHLETE_EQUIPMENT: AthleteEquipment = {
  version: 1,
  strengthVenue: null,
  owned: [],
};
