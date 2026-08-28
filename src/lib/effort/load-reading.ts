import { isSet } from '@/lib/util/value';
/**
 * Presentation helpers for effort load reading — turn ACWR / TSB / capacity
 * into short explained facts (numbers + meaning), not generic coach slogans.
 */

export type AcwrZone = 'under' | 'optimal' | 'alert' | 'danger';

/** The window `classifyAcwrZone` calls optimal — exported so scales draw the same band. */
export const ACWR_SWEET_SPOT = { low: 0.9, high: 1.3 } as const;

export function classifyAcwrZone(acwr: number): AcwrZone {
  if (acwr < 0.9) {
    return 'under';
  }
  if (acwr <= 1.3) {
    return 'optimal';
  }
  if (acwr <= 1.5) {
    return 'alert';
  }
  return 'danger';
}

export function acwrZoneLabel(zone: AcwrZone): string {
  switch (zone) {
    case 'under':
      return 'Sous-charge';
    case 'optimal':
      return 'Zone optimale';
    case 'alert':
      return 'Alerte';
    case 'danger':
      return 'Danger';
  }
}

/** Chip label for ramp risk — French first, no acronym. */
export function rampChipLabel(acwr: number): string {
  if (acwr <= 0) {
    return '—';
  }
  switch (classifyAcwrZone(acwr)) {
    case 'under':
      return 'Lente';
    case 'optimal':
      return 'Saine';
    case 'alert':
      return 'Rapide';
    case 'danger':
      return 'Critique';
  }
}

/** Chip label for form / freshness from TSB — French first. */
export function formChipLabel(tsb: number | null): string {
  if (tsb === undefined || tsb === null) {
    return '—';
  }
  if (tsb <= -20) {
    return 'Fatigué';
  }
  if (tsb < 0) {
    return 'En récup.';
  }
  if (tsb < 10) {
    return 'Équilibré';
  }
  return 'Frais';
}

export function formChipTone(tsb: number | null): 'good' | 'warn' | 'neutral' {
  if (tsb === undefined || tsb === null) {
    return 'neutral';
  }
  if (tsb < 0) {
    return 'warn';
  }
  return 'good';
}

export function rampChipTone(acwr: number): 'good' | 'warn' | 'neutral' {
  if (acwr <= 0) {
    return 'neutral';
  }
  const zone = classifyAcwrZone(acwr);
  if (zone === 'optimal') {
    return 'good';
  }
  if (zone === 'under') {
    return 'neutral';
  }
  return 'warn';
}

/** TSS still needed this week to reach the bottom of the sweet spot (ACWR 0.9). */
export function tssGapToSweetSpotFloor(
  weeklyLoad: number,
  chronicWeeklyAvg: number | null,
): number | null {
  if (chronicWeeklyAvg === undefined || chronicWeeklyAvg === null || chronicWeeklyAvg <= 0) {
    return null;
  }
  const target = Math.round(chronicWeeklyAvg * 0.9);
  return Math.max(0, target - weeklyLoad);
}

/** How far ACWR sits from the sweet-spot center (1.1), as a signed percent. */
export function acwrDeltaFromSweetSpotPct(acwr: number): number {
  const center = 1.1;
  return Math.round(((acwr - center) / center) * 100);
}

export function explainAcwr(input: {
  acwr: number;
  weeklyLoad: number;
  chronicWeeklyAvg: number | null;
}): string {
  const { acwr, weeklyLoad, chronicWeeklyAvg } = input;
  const zone = classifyAcwrZone(acwr);
  const gap = tssGapToSweetSpotFloor(weeklyLoad, chronicWeeklyAvg);

  if (zone === 'under') {
    if (isSet(gap) && gap > 0 && isSet(chronicWeeklyAvg)) {
      return `ACWR ${acwr.toFixed(2)} — ${weeklyLoad} TSS sur 7j vs base ${chronicWeeklyAvg} TSS/sem. Encore ≈${gap} TSS pour rejoindre le plancher du sweet spot (0.9).`;
    }
    return `ACWR ${acwr.toFixed(2)} — charge aiguë nettement sous la base chronique (sweet spot 0.9–1.3).`;
  }
  if (zone === 'optimal') {
    return `ACWR ${acwr.toFixed(2)} — dans le sweet spot (0.9–1.3) : progression possible sans surcharge.`;
  }
  if (zone === 'alert') {
    return `ACWR ${acwr.toFixed(2)} — au-dessus du sweet spot : risque de fatigue si la charge monte encore.`;
  }
  return `ACWR ${acwr.toFixed(2)} — ratio critique : la charge aiguë dépasse largement la base.`;
}

export function explainTsb(tsb: number | null): string | null {
  if (tsb === undefined || tsb === null) {
    return null;
  }
  if (tsb <= -20) {
    return `TSB ${tsb} — forme nettement négative : fatigue aiguë encore présente.`;
  }
  if (tsb < 0) {
    return `TSB ${tsb} — forme légèrement négative : le corps n’est pas encore « frais ».`;
  }
  if (tsb < 10) {
    return `TSB +${tsb} — équilibre forme / fatigue proche de zéro.`;
  }
  return `TSB +${tsb} — forme positive : marge pour absorber de la charge.`;
}

type LoadReadingInput = {
  verdictKey: string;
  acwr: number;
  weeklyLoad: number;
  chronicWeeklyAvg: number | null;
  tsb: number | null;
  trainingCapacity: string;
};

function zoneFallbackReading(zone: ReturnType<typeof classifyAcwrZone>): string {
  if (zone === 'under') {
    return 'Charge aiguë sous la base chronique — marge pour progresser si la forme le permet.';
  }
  if (zone === 'optimal') {
    return 'Montée saine : progression possible sans surcharge.';
  }
  if (zone === 'alert') {
    return 'Montée au-dessus de la zone utile : risque de fatigue si la charge monte encore.';
  }
  return 'Montée critique : la charge aiguë dépasse largement la base.';
}

function plainMaintainUnderReading(gap: number | null, tsb: number | null): string {
  if (isSet(tsb) && tsb < 0) {
    return 'Sous-charge, mais la forme n’est pas encore revenue — on maintient pour laisser remonter.';
  }
  if (isSet(gap) && gap > 0) {
    return `Sous-charge mesurée : encore ≈${gap} TSS pour rejoindre la zone utile, sans accélérer d’un coup.`;
  }
  return 'Charge sous la base : maintenir le niveau actuel plutôt que tout remonter d’un coup.';
}

function plainBuildUnderReading(gap: number | null): string {
  if (isSet(gap) && gap > 0) {
    return `Marge claire : ≈${gap} TSS possibles avant le plancher de la zone utile.`;
  }
  return 'Charge sous la zone utile — la progression reste possible.';
}

const PLAIN_VERDICT_READINGS: Record<string, (gap: number | null, tsb: number | null) => string> = {
  'REDUCE:*': () => 'Montée trop rapide : réduire la charge pour protéger la récupération.',
  'REST_WEEK:*': () => 'Semaine de récupération : laisser digérer la charge accumulée.',
  'TAPER:*': () =>
    'Affûtage : la baisse de volume est volontaire, pas une sous-charge accidentelle.',
  'BUILD:optimal': () =>
    'Montée dans la zone utile — la progression reste compatible avec la récupération.',
};

function plainVerdictReading(
  verdictKey: string,
  zone: ReturnType<typeof classifyAcwrZone>,
  gap: number | null,
  tsb: number | null,
): string | null {
  if (verdictKey === 'MAINTAIN' && zone === 'under') {
    return plainMaintainUnderReading(gap, tsb);
  }
  if (verdictKey === 'BUILD' && zone === 'under') {
    return plainBuildUnderReading(gap);
  }

  const fixed =
    PLAIN_VERDICT_READINGS[`${verdictKey}:*`] ?? PLAIN_VERDICT_READINGS[`${verdictKey}:${zone}`];
  return fixed ? fixed(gap, tsb) : null;
}

type DetailedVerdictInput = {
  verdictKey: string;
  zone: ReturnType<typeof classifyAcwrZone>;
  acwr: number;
  gap: number | null;
  tsb: number | null;
};

function detailedMaintainUnderReading(input: DetailedVerdictInput): string {
  const { acwr, gap, tsb } = input;
  if (isSet(tsb) && tsb < 0) {
    return `Sous-charge (ACWR ${acwr.toFixed(2)}) mais TSB ${tsb} : on ne force pas la remontée — on maintient pour laisser la forme remonter.`;
  }
  if (isSet(gap) && gap > 0) {
    return `Sous-charge mesurée : ≈${gap} TSS manquent pour le sweet spot, mais la directive reste de maintenir — pas d’accélération brutale.`;
  }
  return `Charge sous la base (ACWR ${acwr.toFixed(2)}) : maintenir le niveau actuel plutôt que tout remonter d’un coup.`;
}

function detailedVerdictReading(input: DetailedVerdictInput): string | null {
  const { verdictKey, zone, acwr, gap } = input;
  if (verdictKey === 'MAINTAIN' && zone === 'under') {
    return detailedMaintainUnderReading(input);
  }
  if (verdictKey === 'BUILD' && zone === 'under') {
    return detailedBuildUnderReading(acwr, gap);
  }
  if (verdictKey === 'BUILD' && zone === 'optimal') {
    return `ACWR ${acwr.toFixed(2)} dans la zone utile — la progression reste compatible avec la récupération.`;
  }
  if (verdictKey === 'TAPER') {
    return `Affûtage : la baisse de volume est volontaire, pas une sous-charge accidentelle (ACWR ${acwr.toFixed(2)}).`;
  }
  return null;
}

function detailedBuildUnderReading(acwr: number, gap: number | null): string {
  if (isSet(gap) && gap > 0) {
    return `Marge claire : ACWR ${acwr.toFixed(2)}, ≈${gap} TSS possibles avant le plancher du sweet spot.`;
  }
  return `ACWR ${acwr.toFixed(2)} sous le sweet spot — la charge peut progresser.`;
}

export function synthesizeLoadReadingPlain(input: LoadReadingInput): string {
  const { verdictKey, acwr, weeklyLoad, chronicWeeklyAvg, tsb } = input;
  const zone = classifyAcwrZone(acwr);
  const gap = tssGapToSweetSpotFloor(weeklyLoad, chronicWeeklyAvg);
  return plainVerdictReading(verdictKey, zone, gap, tsb) ?? zoneFallbackReading(zone);
}

export function synthesizeLoadReading(input: LoadReadingInput): string {
  const { verdictKey, acwr, weeklyLoad, chronicWeeklyAvg, tsb } = input;
  const zone = classifyAcwrZone(acwr);
  const gap = tssGapToSweetSpotFloor(weeklyLoad, chronicWeeklyAvg);

  const verdictLine = detailedVerdictReading({ verdictKey, zone, acwr, gap, tsb });
  if (verdictLine) {
    return verdictLine;
  }

  if (verdictKey === 'REDUCE' || verdictKey === 'REST_WEEK') {
    return explainAcwr({ acwr, weeklyLoad, chronicWeeklyAvg });
  }

  return explainAcwr({ acwr, weeklyLoad, chronicWeeklyAvg });
}
