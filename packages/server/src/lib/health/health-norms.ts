import { referenceVo2max, type ReferenceSex } from '@sharpit/server/lib/body/biological-age';

/**
 * Where a health marker stands against a published reference — the "norme" half of Santé's
 * reading (the other half is the athlete's own trend, `health-trend.ts`).
 *
 * Every band names its source in `reference`, shown under the marker: a reading that cannot say
 * where its line comes from is not given. Bands describe, they do not diagnose.
 */

export type HealthTone = 'good' | 'neutral' | 'watch';

export type HealthNorm = {
  band: string;
  label: string;
  tone: HealthTone;
  reference: string;
};

type Band = { upTo: number; band: string; label: string; tone: HealthTone };

function inBands(value: number, bands: readonly Band[], reference: string): HealthNorm {
  const found = bands.find((candidate) => value <= candidate.upTo) ?? bands[bands.length - 1];
  return { band: found.band, label: found.label, tone: found.tone, reference };
}

const RESTING_HR_BANDS: readonly Band[] = [
  { upTo: 50, band: 'athlete', label: 'Niveau athlète', tone: 'good' },
  { upTo: 60, band: 'low', label: 'Basse, signe de bonne forme', tone: 'good' },
  { upTo: 80, band: 'normal', label: 'Dans la norme', tone: 'neutral' },
  { upTo: 100, band: 'high-normal', label: 'Haut de la norme', tone: 'watch' },
  { upTo: Infinity, band: 'high', label: 'Au-dessus de la norme', tone: 'watch' },
];

export function restingHrNorm(bpm: number): HealthNorm {
  return inBands(
    bpm,
    RESTING_HR_BANDS,
    'AHA : 60 à 100 bpm au repos chez l’adulte, plus bas chez les sportifs entraînés.',
  );
}

const SLEEP_BANDS: readonly Band[] = [
  { upTo: 359, band: 'short', label: 'Court, moins de 6 h', tone: 'watch' },
  { upTo: 419, band: 'slightly-short', label: 'Un peu court', tone: 'neutral' },
  { upTo: 540, band: 'recommended', label: 'Dans la recommandation', tone: 'good' },
  { upTo: Infinity, band: 'long', label: 'Long, plus de 9 h', tone: 'neutral' },
];

/** `minutes`: the average night. */
export function sleepNorm(minutes: number): HealthNorm {
  return inBands(
    minutes,
    SLEEP_BANDS,
    'AASM et Sleep Research Society : 7 h ou plus par nuit chez l’adulte.',
  );
}

export function vo2maxNorm(vo2max: number, age: number, sex: ReferenceSex): HealthNorm {
  const mean = referenceVo2max(age, sex);
  const ratio = vo2max / mean;
  const reference = `HUNT3 (Loe et al., 2013) : moyenne de ${Math.round(mean)} mL/kg/min à ton âge.`;
  if (ratio >= 1.2) {
    return { band: 'well-above', label: 'Bien au-dessus de ton âge', tone: 'good', reference };
  }
  if (ratio >= 1.05) {
    return { band: 'above', label: 'Au-dessus de ton âge', tone: 'good', reference };
  }
  if (ratio >= 0.95) {
    return { band: 'average', label: 'Dans la moyenne de ton âge', tone: 'neutral', reference };
  }
  return { band: 'below', label: 'Sous la moyenne de ton âge', tone: 'watch', reference };
}

const BODY_FAT_BANDS: Record<ReferenceSex, readonly Band[]> = {
  male: [
    { upTo: 5.9, band: 'essential', label: 'Très basse', tone: 'watch' },
    { upTo: 13.9, band: 'athlete', label: 'Niveau athlète', tone: 'good' },
    { upTo: 17.9, band: 'fitness', label: 'En forme', tone: 'good' },
    { upTo: 24.9, band: 'average', label: 'Dans la moyenne', tone: 'neutral' },
    { upTo: Infinity, band: 'high', label: 'Élevée', tone: 'watch' },
  ],
  female: [
    { upTo: 13.9, band: 'essential', label: 'Très basse', tone: 'watch' },
    { upTo: 20.9, band: 'athlete', label: 'Niveau athlète', tone: 'good' },
    { upTo: 24.9, band: 'fitness', label: 'En forme', tone: 'good' },
    { upTo: 31.9, band: 'average', label: 'Dans la moyenne', tone: 'neutral' },
    { upTo: Infinity, band: 'high', label: 'Élevée', tone: 'watch' },
  ],
};

export function bodyFatNorm(pct: number, sex: ReferenceSex): HealthNorm {
  return inBands(pct, BODY_FAT_BANDS[sex], 'ACE : catégories de masse grasse par sexe.');
}

export function visceralFatNorm(index: number): HealthNorm {
  return inBands(
    index,
    [
      { upTo: 12, band: 'healthy', label: 'Dans la zone saine', tone: 'good' },
      { upTo: Infinity, band: 'excess', label: 'Au-dessus de la zone saine', tone: 'watch' },
    ],
    'Indice des balances Tanita : 1 à 12 sain, 13 et plus en excès.',
  );
}

/** `steps`: the average day. The benefit levels off lower after 60. */
export function stepsNorm(steps: number, age: number | null): HealthNorm {
  const target = age !== null && age >= 60 ? 6_000 : 8_000;
  const reference =
    'Paluch et al., Lancet Public Health 2022 : le bénéfice plafonne vers 8 000 à 10 000 pas avant 60 ans, 6 000 à 8 000 après.';
  if (steps >= target) {
    return { band: 'active', label: 'Au niveau du bénéfice santé', tone: 'good', reference };
  }
  if (steps >= target * 0.6) {
    return { band: 'moderate', label: 'Un peu en dessous', tone: 'neutral', reference };
  }
  return { band: 'low', label: 'Peu de pas', tone: 'watch', reference };
}

/** Breaths per minute during sleep. */
export function respirationNorm(perMinute: number): HealthNorm {
  const reference = 'Repère clinique adulte : 12 à 20 respirations par minute au repos.';
  if (perMinute >= 12 && perMinute <= 20) {
    return { band: 'normal', label: 'Dans la norme', tone: 'good', reference };
  }
  return { band: 'outside', label: 'Hors de la norme', tone: 'watch', reference };
}

/**
 * No population norm: HRV depends on the device (Apple measures SDNN, Garmin RMSSD), age and
 * person too much for one. The norm is the athlete's own range.
 */
export function hrvNorm(ms: number, range: { low: number; high: number }): HealthNorm {
  const reference =
    'Pas de norme de population fiable pour la VFC : ta propre plage, établie sur tes dernières semaines.';
  if (ms < range.low) {
    return { band: 'below', label: 'Sous ta plage habituelle', tone: 'watch', reference };
  }
  if (ms > range.high) {
    return { band: 'above', label: 'Au-dessus de ta plage', tone: 'good', reference };
  }
  return { band: 'within', label: 'Dans ta plage habituelle', tone: 'good', reference };
}
