/**
 * Presentation helpers for effort load reading — turn ACWR / TSB / capacity
 * into short explained facts (numbers + meaning), not generic coach slogans.
 */

export type AcwrZone = 'under' | 'optimal' | 'alert' | 'danger';

export function classifyAcwrZone(acwr: number): AcwrZone {
  if (acwr < 0.9) return 'under';
  if (acwr <= 1.3) return 'optimal';
  if (acwr <= 1.5) return 'alert';
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

/** TSS still needed this week to reach the bottom of the sweet spot (ACWR 0.9). */
export function tssGapToSweetSpotFloor(
  weeklyLoad: number,
  chronicWeeklyAvg: number | null,
): number | null {
  if (chronicWeeklyAvg == null || chronicWeeklyAvg <= 0) return null;
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
    if (gap != null && gap > 0 && chronicWeeklyAvg != null) {
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
  if (tsb == null) return null;
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

/**
 * One synthesis line that connects product posture, fatigue directive, and numbers.
 * Avoids repeating the same slogan three times.
 */
export function synthesizeLoadReading(input: {
  verdictKey: string;
  acwr: number;
  weeklyLoad: number;
  chronicWeeklyAvg: number | null;
  tsb: number | null;
  trainingCapacity: string;
}): string {
  const { verdictKey, acwr, weeklyLoad, chronicWeeklyAvg, tsb } = input;
  const zone = classifyAcwrZone(acwr);
  const gap = tssGapToSweetSpotFloor(weeklyLoad, chronicWeeklyAvg);

  if (verdictKey === 'MAINTAIN' && zone === 'under') {
    if (tsb != null && tsb < 0) {
      return `Sous-charge (ACWR ${acwr.toFixed(2)}) mais TSB ${tsb} : on ne force pas la remontée — on maintient pour laisser la forme remonter.`;
    }
    if (gap != null && gap > 0) {
      return `Sous-charge mesurée : ≈${gap} TSS manquent pour le sweet spot, mais la directive reste de maintenir — pas d’accélération brutale.`;
    }
    return `Charge sous la base (ACWR ${acwr.toFixed(2)}) : maintenir le niveau actuel plutôt que tout remonter d’un coup.`;
  }

  if (verdictKey === 'BUILD' && zone === 'under') {
    if (gap != null && gap > 0) {
      return `Marge claire : ACWR ${acwr.toFixed(2)}, ≈${gap} TSS possibles avant le plancher du sweet spot.`;
    }
    return `ACWR ${acwr.toFixed(2)} sous le sweet spot — la charge peut progresser.`;
  }

  if (verdictKey === 'BUILD' && zone === 'optimal') {
    return `ACWR ${acwr.toFixed(2)} dans la zone utile — la progression reste compatible avec la récupération.`;
  }

  if (verdictKey === 'REDUCE' || verdictKey === 'REST_WEEK') {
    return explainAcwr({ acwr, weeklyLoad, chronicWeeklyAvg });
  }

  if (verdictKey === 'TAPER') {
    return `Affûtage : la baisse de volume est volontaire, pas une sous-charge accidentelle (ACWR ${acwr.toFixed(2)}).`;
  }

  return explainAcwr({ acwr, weeklyLoad, chronicWeeklyAvg });
}
