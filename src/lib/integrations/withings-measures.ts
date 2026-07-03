/**
 * Types de mesure Withings — Body Scan & balances compatibles.
 * @see https://developer.withings.com/developer-guide/v3/integration-guide/onsite-mode/data-api/all-available-health-data-body-scan/
 */
export const WITHINGS_MEASURE = {
  WEIGHT: 1,
  HEIGHT: 4,
  FAT_FREE_MASS: 5,
  FAT_RATIO: 6,
  FAT_MASS: 8,
  HEART_RATE: 11,
  MUSCLE_MASS: 76,
  HYDRATION: 77,
  BONE_MASS: 88,
  PULSE_WAVE_VELOCITY: 91,
  VO2_MAX: 123,
  AFIB_ECG: 130,
  QRS_INTERVAL: 135,
  PR_INTERVAL: 136,
  QT_INTERVAL: 137,
  QTC_INTERVAL: 138,
  AFIB_PPG: 139,
  /** Classification FA ECG (Body Scan — distinct de 130 selon firmware). */
  AFIB_ECG_CLASS: 145,
  VASCULAR_AGE: 155,
  NERVE_HEALTH_LEFT: 158,
  NERVE_HEALTH_RIGHT: 159,
  NERVE_HEALTH_FEET_MAX: 167,
  EXTRACELLULAR_WATER: 168,
  INTRACELLULAR_WATER: 169,
  VISCERAL_FAT_INDEX: 170,
  FAT_FREE_MASS_SEGMENTAL: 173,
  FAT_MASS_SEGMENTAL: 174,
  MUSCLE_MASS_SEGMENTAL: 175,
  NERVE_RESPONSE_SCORE: 196,
  BMR: 226,
  METABOLIC_AGE: 227,
  SKIN_CONDUCTANCE: 229,
} as const;

/** Tous les meastypes utiles pour Body Scan (getmeas). */
export const WITHINGS_BODY_SCAN_MEASTYPES = [
  WITHINGS_MEASURE.WEIGHT,
  WITHINGS_MEASURE.HEIGHT,
  WITHINGS_MEASURE.FAT_FREE_MASS,
  WITHINGS_MEASURE.FAT_RATIO,
  WITHINGS_MEASURE.FAT_MASS,
  WITHINGS_MEASURE.HEART_RATE,
  WITHINGS_MEASURE.MUSCLE_MASS,
  WITHINGS_MEASURE.HYDRATION,
  WITHINGS_MEASURE.BONE_MASS,
  WITHINGS_MEASURE.PULSE_WAVE_VELOCITY,
  WITHINGS_MEASURE.VO2_MAX,
  WITHINGS_MEASURE.AFIB_ECG,
  WITHINGS_MEASURE.AFIB_ECG_CLASS,
  WITHINGS_MEASURE.QRS_INTERVAL,
  WITHINGS_MEASURE.PR_INTERVAL,
  WITHINGS_MEASURE.QT_INTERVAL,
  WITHINGS_MEASURE.QTC_INTERVAL,
  WITHINGS_MEASURE.AFIB_PPG,
  WITHINGS_MEASURE.VASCULAR_AGE,
  WITHINGS_MEASURE.NERVE_HEALTH_LEFT,
  WITHINGS_MEASURE.NERVE_HEALTH_RIGHT,
  WITHINGS_MEASURE.NERVE_HEALTH_FEET_MAX,
  WITHINGS_MEASURE.EXTRACELLULAR_WATER,
  WITHINGS_MEASURE.INTRACELLULAR_WATER,
  WITHINGS_MEASURE.VISCERAL_FAT_INDEX,
  WITHINGS_MEASURE.FAT_FREE_MASS_SEGMENTAL,
  WITHINGS_MEASURE.FAT_MASS_SEGMENTAL,
  WITHINGS_MEASURE.MUSCLE_MASS_SEGMENTAL,
  WITHINGS_MEASURE.NERVE_RESPONSE_SCORE,
  WITHINGS_MEASURE.BMR,
  WITHINGS_MEASURE.METABOLIC_AGE,
  WITHINGS_MEASURE.SKIN_CONDUCTANCE,
].join(',');

/** Fenêtre (s) pour fusionner plusieurs measuregrps d'une même pesée Body Scan. */
export const WITHINGS_SESSION_MERGE_SEC = 300;

export interface WithingsRawMeasureGroup {
  grpid: number;
  date: number;
  category: number;
  measures: Array<{ value: number; type: number; unit: number; fm?: number }>;
}

/** Fusionne les groupes Withings d'une même session (composition + cardio + nerveux). */
export function mergeWithingsMeasureGroups(
  groups: WithingsRawMeasureGroup[],
): Array<{ grpid: number; date: number; measures: WithingsRawMeasureGroup['measures'] }> {
  const real = groups.filter((g) => g.category === 1);
  if (real.length === 0) return [];

  const sorted = [...real].sort((a, b) => a.date - b.date);
  const clusters: WithingsRawMeasureGroup[][] = [];

  for (const group of sorted) {
    const last = clusters[clusters.length - 1];
    const clusterStart = last?.[0]?.date;
    if (clusterStart == null || group.date - clusterStart > WITHINGS_SESSION_MERGE_SEC) {
      clusters.push([group]);
    } else {
      last.push(group);
    }
  }

  return clusters.map((cluster) => {
    const byType = new Map<number, WithingsRawMeasureGroup['measures'][number]>();
    for (const g of cluster) {
      for (const m of g.measures) {
        byType.set(m.type, m);
      }
    }
    const primary =
      cluster.find((g) => g.measures.some((m) => m.type === WITHINGS_MEASURE.WEIGHT)) ??
      cluster[0]!;
    return {
      grpid: primary.grpid,
      date: primary.date,
      measures: Array.from(byType.values()),
    };
  });
}

const SEGMENTAL_TYPES = new Set<number>([
  WITHINGS_MEASURE.FAT_FREE_MASS_SEGMENTAL,
  WITHINGS_MEASURE.FAT_MASS_SEGMENTAL,
  WITHINGS_MEASURE.MUSCLE_MASS_SEGMENTAL,
]);

const ECG_TYPES = new Set<number>([
  WITHINGS_MEASURE.AFIB_ECG,
  WITHINGS_MEASURE.AFIB_ECG_CLASS,
  WITHINGS_MEASURE.QRS_INTERVAL,
  WITHINGS_MEASURE.PR_INTERVAL,
  WITHINGS_MEASURE.QT_INTERVAL,
  WITHINGS_MEASURE.QTC_INTERVAL,
  WITHINGS_MEASURE.AFIB_PPG,
]);

const AFIB_CLASSIFICATION_TYPES = new Set<number>([
  WITHINGS_MEASURE.AFIB_ECG,
  WITHINGS_MEASURE.AFIB_ECG_CLASS,
  WITHINGS_MEASURE.AFIB_PPG,
]);

/** Classification FA : préfère `fm` si présent (code affiché dans l'app). */
function decodeEcgStoredValue(m: {
  value: number;
  type: number;
  unit: number;
  fm?: number;
}): number {
  const decoded = decodeWithingsValue(m.value, m.unit);
  if (AFIB_CLASSIFICATION_TYPES.has(m.type) && m.fm != null && m.fm >= 0 && m.fm <= 20) {
    return m.fm;
  }
  return decoded;
}

export interface WithingsHeartRecord {
  timestamp: number;
  heart_rate?: number;
  ecg?: { signalid: number; afib: number };
}

/** Aligne la classification ECG sur Heart v2 (même source que l'app Withings). */
export function enrichMeasurementsWithHeartEcg(
  measurements: WithingsParsedMeasurement[],
  heartRecords: WithingsHeartRecord[],
): WithingsParsedMeasurement[] {
  return measurements.map((m) => {
    const tMs = m.measuredAt.getTime();
    let best: WithingsHeartRecord | null = null;
    let bestDelta = Infinity;

    for (const record of heartRecords) {
      if (record.ecg?.afib == null) continue;
      const delta = Math.abs(record.timestamp * 1000 - tMs);
      if (delta <= WITHINGS_SESSION_MERGE_SEC * 1000 && delta < bestDelta) {
        best = record;
        bestDelta = delta;
      }
    }

    if (!best?.ecg) return m;

    const extras: WithingsExtras = { ...(m.withingsExtras ?? {}) };
    extras.ecgAfibClassification = best.ecg.afib;
    extras.ecg = {
      ...(extras.ecg ?? {}),
      [String(WITHINGS_MEASURE.AFIB_ECG)]: best.ecg.afib,
    };
    if (best.heart_rate != null && m.heartRate == null) {
      return { ...m, heartRate: best.heart_rate, withingsExtras: extras };
    }
    return { ...m, withingsExtras: extras };
  });
}

export interface WithingsExtras {
  segmental?: Array<{ type: number; value: number; unit: number; fm?: number }>;
  ecg?: Record<string, number>;
  /** Classification FA depuis Heart v2 — alignée sur l'app Withings. */
  ecgAfibClassification?: number;
  heightM?: number;
}

export interface WithingsParsedMeasurement {
  grpid: string;
  measuredAt: Date;
  weightKg: number | null;
  heightM: number | null;
  bmi: number | null;
  bodyFatPct: number | null;
  muscleKg: number | null;
  boneKg: number | null;
  fatFreeWeightKg: number | null;
  fatMassKg: number | null;
  hydrationKg: number | null;
  waterPct: number | null;
  heartRate: number | null;
  bmr: number | null;
  visceralFat: number | null;
  vascularAgeYears: number | null;
  pulseWaveVelocity: number | null;
  vo2Max: number | null;
  nerveHealthScore: number | null;
  nerveHealthLeft: number | null;
  nerveHealthRight: number | null;
  nerveResponseScore: number | null;
  skinConductance: number | null;
  metabolicAge: number | null;
  extracellularWaterKg: number | null;
  intracellularWaterKg: number | null;
  withingsExtras: WithingsExtras | null;
}

/** Decode Withings measure value: actual = value × 10^unit */
export function decodeWithingsValue(value: number, unit: number): number {
  return value * 10 ** unit;
}

function getScalar(byType: Map<number, number>, type: number): number | null {
  const v = byType.get(type);
  return v != null ? v : null;
}

function computeWaterPct(
  weightKg: number | null,
  hydrationKg: number | null,
  extraKg: number | null,
  intraKg: number | null,
): number | null {
  if (weightKg == null || weightKg <= 0) return null;
  if (hydrationKg != null) return Number(((hydrationKg / weightKg) * 100).toFixed(1));
  if (extraKg != null && intraKg != null) {
    return Number((((extraKg + intraKg) / weightKg) * 100).toFixed(1));
  }
  return null;
}

function computeBmi(weightKg: number | null, heightM: number | null): number | null {
  if (weightKg == null || heightM == null || heightM <= 0) return null;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

export function parseWithingsMeasureGroup(group: {
  grpid: number;
  date: number;
  measures: Array<{ value: number; type: number; unit: number; fm?: number }>;
}): WithingsParsedMeasurement {
  const byType = new Map<number, number>();
  const segmental: WithingsExtras['segmental'] = [];
  const ecg: Record<string, number> = {};

  for (const m of group.measures) {
    const decoded = decodeWithingsValue(m.value, m.unit);

    if (SEGMENTAL_TYPES.has(m.type)) {
      segmental!.push({ type: m.type, value: m.value, unit: m.unit, fm: m.fm });
      continue;
    }

    if (ECG_TYPES.has(m.type)) {
      ecg[String(m.type)] = decodeEcgStoredValue(m);
      continue;
    }

    byType.set(m.type, decoded);
  }

  const weightKg = getScalar(byType, WITHINGS_MEASURE.WEIGHT);
  const heightM = getScalar(byType, WITHINGS_MEASURE.HEIGHT);
  const muscleKg = getScalar(byType, WITHINGS_MEASURE.MUSCLE_MASS);
  const hydrationKg = getScalar(byType, WITHINGS_MEASURE.HYDRATION);
  const extraKg = getScalar(byType, WITHINGS_MEASURE.EXTRACELLULAR_WATER);
  const intraKg = getScalar(byType, WITHINGS_MEASURE.INTRACELLULAR_WATER);

  const withingsExtras: WithingsExtras | null =
    segmental!.length > 0 || Object.keys(ecg).length > 0 || heightM != null
      ? {
          ...(segmental!.length > 0 ? { segmental: segmental! } : {}),
          ...(Object.keys(ecg).length > 0 ? { ecg } : {}),
          ...(heightM != null ? { heightM } : {}),
        }
      : null;

  return {
    grpid: String(group.grpid),
    measuredAt: new Date(group.date * 1000),
    weightKg,
    heightM,
    bmi: computeBmi(weightKg, heightM),
    bodyFatPct: getScalar(byType, WITHINGS_MEASURE.FAT_RATIO),
    muscleKg,
    boneKg: getScalar(byType, WITHINGS_MEASURE.BONE_MASS),
    fatFreeWeightKg: getScalar(byType, WITHINGS_MEASURE.FAT_FREE_MASS),
    fatMassKg: getScalar(byType, WITHINGS_MEASURE.FAT_MASS),
    hydrationKg,
    waterPct: computeWaterPct(weightKg, hydrationKg, extraKg, intraKg),
    heartRate: getScalar(byType, WITHINGS_MEASURE.HEART_RATE),
    bmr: getScalar(byType, WITHINGS_MEASURE.BMR),
    visceralFat: getScalar(byType, WITHINGS_MEASURE.VISCERAL_FAT_INDEX),
    vascularAgeYears: getScalar(byType, WITHINGS_MEASURE.VASCULAR_AGE),
    pulseWaveVelocity: getScalar(byType, WITHINGS_MEASURE.PULSE_WAVE_VELOCITY),
    vo2Max: getScalar(byType, WITHINGS_MEASURE.VO2_MAX),
    nerveHealthScore: getScalar(byType, WITHINGS_MEASURE.NERVE_HEALTH_FEET_MAX),
    nerveHealthLeft: getScalar(byType, WITHINGS_MEASURE.NERVE_HEALTH_LEFT),
    nerveHealthRight: getScalar(byType, WITHINGS_MEASURE.NERVE_HEALTH_RIGHT),
    nerveResponseScore: getScalar(byType, WITHINGS_MEASURE.NERVE_RESPONSE_SCORE),
    skinConductance: getScalar(byType, WITHINGS_MEASURE.SKIN_CONDUCTANCE),
    metabolicAge: getScalar(byType, WITHINGS_MEASURE.METABOLIC_AGE),
    extracellularWaterKg: extraKg,
    intracellularWaterKg: intraKg,
    withingsExtras,
  };
}
