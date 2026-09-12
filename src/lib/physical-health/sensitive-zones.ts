/**
 * Binds the athlete's sensitive zones to the exercises a session prescribes.
 *
 * The coach context already names the zones ("zone Ischio (Gauche)"), and the
 * prompt already says never to aggravate a sensitive zone — but the strength
 * rules are the same for everyone, and nothing checked afterwards that a
 * prescribed exercise avoided the injured region. This module is the missing
 * link between a condition and the exercise catalog.
 *
 * Pure: no I/O, no React.
 */

/** Catalog body groups, as they appear in `src/data/exercises-catalog.json`. */
export type CatalogBodyPart =
  | 'upper legs'
  | 'lower legs'
  | 'back'
  | 'waist'
  | 'chest'
  | 'shoulders'
  | 'upper arms'
  | 'lower arms'
  | 'neck'
  | 'cardio';

/** Anything that carries a body region — coach context, gate context or legacy note. */
export type ZoneCondition = {
  label?: string | null;
  title?: string | null;
  bodyRegion?: string | null;
  bodyPart?: string | null;
  side?: string | null;
  severity?: number | null;
  type?: string | null;
  category?: string | null;
  affectsTraining?: boolean | null;
  status?: string | null;
};

export type SensitiveZone = {
  label: string;
  region: string;
  side: string | null;
  severity: number | null;
  /** Catalog groups this zone loads — empty when the region is unknown to the catalog. */
  groups: CatalogBodyPart[];
};

/**
 * French regions the athlete actually writes, mapped onto the catalog's coarse
 * groups. A knee spans both thigh and calf work: err on the side of naming one
 * group too many, since the consequence is a warning, not a rejection.
 */
const REGION_GROUPS: ReadonlyArray<{
  match: readonly string[];
  groups: readonly CatalogBodyPart[];
}> = [
  {
    match: ['ischio', 'cuisse', 'quadriceps', 'adducteur', 'psoas', 'fessier', 'hanche'],
    groups: ['upper legs'],
  },
  { match: ['genou', 'rotule', 'patellaire'], groups: ['upper legs', 'lower legs'] },
  {
    match: ['mollet', 'achille', 'tibia', 'cheville', 'pied', 'plantaire', 'orteil'],
    groups: ['lower legs'],
  },
  { match: ['bassin', 'sacro', 'abdo', 'gainage', 'core', 'oblique'], groups: ['waist'] },
  { match: ['lombaire', 'dos', 'rachis', 'dorsale', 'thoracique', 'trapeze'], groups: ['back'] },
  { match: ['epaule', 'coiffe', 'deltoide', 'acromio'], groups: ['shoulders'] },
  { match: ['cou', 'nuque', 'cervicale'], groups: ['neck'] },
  { match: ['coude', 'poignet', 'avant-bras', 'main'], groups: ['lower arms'] },
  { match: ['bras', 'biceps', 'triceps'], groups: ['upper arms'] },
  { match: ['pectoraux', 'poitrine', 'thorax', 'sternum'], groups: ['chest'] },
];

const SYMPTOMATIC = new Set(['PAIN', 'INJURY']);

export function normalizeRegion(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Catalog groups a region loads. Empty when nothing matches — never guess. */
export function catalogGroupsForRegion(region: string | null | undefined): CatalogBodyPart[] {
  if (!region) {
    return [];
  }
  const normalized = normalizeRegion(region);
  const entry = REGION_GROUPS.find(({ match }) => match.some((word) => normalized.includes(word)));
  return entry ? [...entry.groups] : [];
}

function isSymptomatic(condition: ZoneCondition): boolean {
  const kind = (condition.type ?? condition.category ?? '').toUpperCase();
  if (!SYMPTOMATIC.has(kind)) {
    return false;
  }
  if (condition.status && condition.status.toUpperCase() === 'RESOLVED') {
    return false;
  }
  return condition.affectsTraining !== false;
}

function zoneSide(side: string | null | undefined): string | null {
  return side && side !== 'NA' ? side : null;
}

/** One condition as a protectable zone, or null when it names no region. */
function toZone(condition: ZoneCondition): SensitiveZone | null {
  const region = condition.bodyRegion ?? condition.bodyPart ?? null;
  if (!region) {
    return null;
  }
  return {
    label: condition.label ?? condition.title ?? region,
    region,
    side: zoneSide(condition.side),
    severity: condition.severity ?? null,
    groups: catalogGroupsForRegion(region),
  };
}

/** Pains and injuries that still constrain training, with their catalog groups. */
export function sensitiveZonesFrom(
  conditions: readonly ZoneCondition[] | null | undefined,
): SensitiveZone[] {
  if (!conditions) {
    return [];
  }
  return conditions.filter(isSymptomatic).flatMap((condition) => {
    const zone = toZone(condition);
    return zone ? [zone] : [];
  });
}

/** The zone an exercise would load, when it is one the athlete is protecting. */
export function exerciseZoneConflict(
  bodyPart: string | null | undefined,
  zones: readonly SensitiveZone[],
): SensitiveZone | null {
  if (!bodyPart) {
    return null;
  }
  const normalized = normalizeRegion(bodyPart);
  return (
    zones.find((zone) => zone.groups.some((group) => normalizeRegion(group) === normalized)) ?? null
  );
}

function zoneLine(zone: SensitiveZone): string {
  const side = zone.side ? ` (${zone.side.toLowerCase()})` : '';
  const severity = zone.severity !== null ? `, sévérité ${zone.severity}/10` : '';
  return `- ${zone.label} — zone ${zone.region}${side}${severity}`;
}

/**
 * Per-request block naming this athlete's zones. Empty string when there is
 * nothing to protect, so the prompt stays short for everyone else.
 */
export function formatSensitiveZoneRules(zones: readonly SensitiveZone[]): string {
  if (zones.length === 0) {
    return '';
  }
  return [
    '\n## Zones sensibles à protéger dans le choix des exercices',
    ...zones.map(zoneLine),
    "IMPÉRATIF pour toute séance STRENGTH : ne prescris aucun exercice qui charge directement ces zones. Renforce AUTOUR (agonistes, antagonistes, stabilisateurs), privilégie l'isométrique et l'excentrique contrôlé, et nomme explicitement l'adaptation dans la description de la séance.",
  ].join('\n');
}
