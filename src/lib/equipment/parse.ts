import {
  EQUIPMENT_CATALOG,
  isEquipmentItemId,
  isStrengthVenue,
  type EquipmentItemId,
  type StrengthVenue,
} from '@/lib/equipment/catalog';
import { EMPTY_ATHLETE_EQUIPMENT, type AthleteEquipment } from '@/lib/equipment/types';

function uniqueOwned(ids: EquipmentItemId[]): EquipmentItemId[] {
  return [...new Set(ids)];
}

/** Drop home-only strength items when venue no longer allows them. */
export function sanitizeOwnedForVenue(
  owned: EquipmentItemId[],
  strengthVenue: StrengthVenue | null,
): EquipmentItemId[] {
  return uniqueOwned(owned).filter((id) => {
    const item = EQUIPMENT_CATALOG.find((entry) => entry.id === id);
    if (!item?.requiresStrengthVenue) return true;
    if (strengthVenue == null) return false;
    return item.requiresStrengthVenue.includes(strengthVenue as 'home' | 'both');
  });
}

export function normalizeAthleteEquipment(raw: unknown): AthleteEquipment {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...EMPTY_ATHLETE_EQUIPMENT };
  }

  const record = raw as Record<string, unknown>;
  const strengthVenue =
    typeof record.strengthVenue === 'string' && isStrengthVenue(record.strengthVenue)
      ? record.strengthVenue
      : null;

  const ownedRaw = Array.isArray(record.owned) ? record.owned : [];
  const owned = ownedRaw.filter(
    (id): id is EquipmentItemId => typeof id === 'string' && isEquipmentItemId(id),
  );

  return {
    version: 1,
    strengthVenue,
    owned: sanitizeOwnedForVenue(owned, strengthVenue),
  };
}

export function hasConfiguredEquipment(equipment: AthleteEquipment): boolean {
  return equipment.strengthVenue != null || equipment.owned.length > 0;
}

export function toggleOwnedItem(
  equipment: AthleteEquipment,
  itemId: EquipmentItemId,
  enabled: boolean,
): AthleteEquipment {
  const without = equipment.owned.filter((id) => id !== itemId);
  const owned = enabled ? [...without, itemId] : without;
  return {
    ...equipment,
    owned: sanitizeOwnedForVenue(owned, equipment.strengthVenue),
  };
}

export function setStrengthVenue(
  equipment: AthleteEquipment,
  strengthVenue: StrengthVenue | null,
): AthleteEquipment {
  return {
    ...equipment,
    strengthVenue,
    owned: sanitizeOwnedForVenue(equipment.owned, strengthVenue),
  };
}
