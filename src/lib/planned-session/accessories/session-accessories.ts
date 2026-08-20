import type { ActivityType } from '@prisma/client';
import {
  EQUIPMENT_CATALOG,
  type EquipmentItemId,
  isEquipmentItemId,
} from '@/lib/equipment/catalog';
import { parseStrengthPrescription } from '@/lib/planned-session/strength/strength-prescription';

export type SessionAccessoryView = {
  readonly id: EquipmentItemId;
  readonly label: string;
};

/** Accessories that are pack-for-session props (not venue access). */
const SESSION_PROP_IDS: readonly EquipmentItemId[] = [
  'swim_fins',
  'swim_paddles',
  'swim_pull_buoy',
  'strength_dumbbells',
  'strength_barbell',
  'strength_bench',
  'strength_pullup_bar',
  'strength_bands',
  'strength_trx',
  'strength_rings',
  'strength_dip_bars',
  'strength_weighted_vest',
  'mobility_foam_roller',
  'mobility_bands',
  'mobility_tennis_ball',
  'mobility_yoga_block',
  'bike_home_trainer',
  'run_treadmill',
];

// Avoid `\b` with accented FR words — JS word chars are ASCII-only.
const KEYWORD_TO_IDS: ReadonlyArray<{ pattern: RegExp; ids: EquipmentItemId[] }> = [
  { pattern: /pull[\s-]?buoy|pullbuoy/i, ids: ['swim_pull_buoy'] },
  { pattern: /palmes?|\bfins?\b/i, ids: ['swim_fins'] },
  { pattern: /plaquettes?|\bpaddles?\b/i, ids: ['swim_paddles'] },
  {
    pattern: /élastiques?|\bbandes?\b|banded|resistance band/i,
    ids: ['strength_bands', 'mobility_bands'],
  },
  { pattern: /foam[\s-]?roller|rouleau|\bstick\b/i, ids: ['mobility_foam_roller'] },
  { pattern: /\btrx\b|sangles?|suspension/i, ids: ['strength_trx'] },
  { pattern: /anneaux?|\brings?\b|muscle[\s-]?up/i, ids: ['strength_rings'] },
  { pattern: /\bdips?\b/i, ids: ['strength_dip_bars'] },
  {
    pattern: /gilet lest|ceinture de lest|lest[eé]|weighted vest|rucking/i,
    ids: ['strength_weighted_vest'],
  },
  {
    pattern: /halt[eè]res?|kettlebell|dumbbell/i,
    ids: ['strength_dumbbells'],
  },
  { pattern: /\bbarre\b|barbell|disques?/i, ids: ['strength_barbell'] },
  { pattern: /\bbanc\b|\bbench\b/i, ids: ['strength_bench'] },
  { pattern: /traction|pull[\s-]?up/i, ids: ['strength_pullup_bar'] },
  { pattern: /\bballe\b|tennis ball|gâchettes?/i, ids: ['mobility_tennis_ball'] },
  { pattern: /briques?|yoga block/i, ids: ['mobility_yoga_block'] },
  { pattern: /home[\s-]?trainer|hometrainer/i, ids: ['bike_home_trainer'] },
  { pattern: /\btapis\b|treadmill/i, ids: ['run_treadmill'] },
];

function catalogLabel(id: EquipmentItemId): string {
  return EQUIPMENT_CATALOG.find((item) => item.id === id)?.label ?? id;
}

function sportAllows(id: EquipmentItemId, type: ActivityType): boolean {
  const item = EQUIPMENT_CATALOG.find((entry) => entry.id === id);
  if (!item) return false;
  if (type === 'SWIM') return item.sport === 'SWIM';
  if (type === 'BIKE') return item.sport === 'BIKE';
  // Portable load is catalogued under STRENGTH but packs for a run (hill reps, rucking).
  if (type === 'RUN') return item.sport === 'RUN' || id === 'strength_weighted_vest';
  if (type === 'STRENGTH') return item.sport === 'STRENGTH' || item.sport === 'MOBILITY';
  // OTHER / TRIATHLON — allow session props across sports
  return SESSION_PROP_IDS.includes(id);
}

/** Soft-parse persisted accessories JSON → catalog ids. */
export function parseSessionAccessories(raw: unknown): EquipmentItemId[] {
  if (!Array.isArray(raw)) return [];
  const ids: EquipmentItemId[] = [];
  for (const value of raw) {
    if (typeof value === 'string' && isEquipmentItemId(value) && !ids.includes(value)) {
      ids.push(value);
    }
  }
  return ids;
}

/**
 * Accessories for a planned session: explicit list first, else keyword inference
 * from title / description / strength exercises.
 */
export function resolveSessionAccessories(input: {
  type: ActivityType;
  title?: string | null;
  description?: string | null;
  accessories?: unknown;
  strengthPrescription?: unknown;
}): SessionAccessoryView[] {
  const explicit = parseSessionAccessories(input.accessories).filter((id) =>
    sportAllows(id, input.type),
  );
  if (explicit.length > 0) {
    return explicit.map((id) => ({ id, label: catalogLabel(id) }));
  }

  const prescription = parseStrengthPrescription(input.strengthPrescription);
  const exerciseNames =
    prescription?.sets.map((set) => set.exercise) ??
    (Array.isArray((input.strengthPrescription as { sets?: unknown } | null)?.sets)
      ? ((input.strengthPrescription as { sets: Array<{ exercise?: string }> }).sets ?? []).map(
          (set) => set.exercise ?? '',
        )
      : []);

  const haystack = [input.title ?? '', input.description ?? '', ...exerciseNames]
    .join(' · ')
    .toLowerCase();

  if (!haystack.trim()) return [];

  const found = new Set<EquipmentItemId>();
  for (const rule of KEYWORD_TO_IDS) {
    if (!rule.pattern.test(haystack)) continue;
    for (const id of rule.ids) {
      if (sportAllows(id, input.type) && SESSION_PROP_IDS.includes(id)) {
        found.add(id);
      }
    }
  }

  return [...found].map((id) => ({ id, label: catalogLabel(id) }));
}

/** Catalog choices for the session editor, filtered by sport. */
export function accessoryOptionsForActivityType(type: ActivityType): SessionAccessoryView[] {
  return SESSION_PROP_IDS.filter((id) => sportAllows(id, type)).map((id) => ({
    id,
    label: catalogLabel(id),
  }));
}
