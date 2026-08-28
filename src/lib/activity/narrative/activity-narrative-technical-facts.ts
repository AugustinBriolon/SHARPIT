/**
 * Deterministic technical facts for post-session narrative.
 * Only emits lines that clear a noteworthiness bar — silence is preferred
 * over permanent form tips (cadence “ideals”, foot strike, etc.).
 *
 * Cadence / swim pace stay in the raw session facts block — not here —
 * so the model is not nudged into perpetual technique coaching.
 */

import type { ActivityAnalysis, ZoneBucket } from '@/lib/activity/detail/activity-analysis';

export type TechnicalSport = 'RUN' | 'BIKE' | 'SWIM';

export type TechnicalFactInput = {
  sport: TechnicalSport;
  analysis: ActivityAnalysis | null;
};

/** Aerobic decoupling worth mentioning (~classic 5% rule of thumb). */
export const DECOUPLING_NOTEWORTHY_PCT = 5;
/** Pace variability (CV) worth a line. */
export const PACE_VARIABILITY_NOTEWORTHY_PCT = 8;
/** Power variability index — ragged effort. */
export const VI_NOTEWORTHY = 1.1;
/** Share of time in Z4+ that is session-shaping. */
export const HARD_ZONE_SHARE_NOTEWORTHY_PCT = 12;
/** Dominant single zone. */
export const DOMINANT_ZONE_PCT = 50;

function zoneSummary(zones: ZoneBucket[]): string | null {
  const active = zones.filter((z) => z.seconds > 0 && z.percent > 0);
  if (!active.length) {
    return null;
  }
  return active.map((z) => `${z.shortLabel} ${z.percent}%`).join(', ');
}

function hardZoneShare(zones: ZoneBucket[]): number {
  return zones.filter((z) => z.id === 'z4' || z.id === 'z5').reduce((sum, z) => sum + z.percent, 0);
}

function dominantZone(zones: ZoneBucket[]): ZoneBucket | null {
  if (!zones.length) {
    return null;
  }
  return zones.reduce((best, z) => (z.percent > best.percent ? z : best), zones[0]!);
}

function appendHrZoneFacts(lines: string[], hr: ActivityAnalysis['hr'], thresholds: ActivityAnalysis['thresholds']): void {
  if (hr.zones.length === 0 || !thresholds.lthr) {
    return;
  }
  const sourceLabel = thresholds.source === 'profile' ? 'profil' : 'estimé';
  const summary = zoneSummary(hr.zones);
  if (summary) {
    lines.push(`Zones FC (LTHR ${thresholds.lthr} bpm · ${sourceLabel}) : ${summary}.`);
  }

  const hard = hardZoneShare(hr.zones);
  if (hard >= HARD_ZONE_SHARE_NOTEWORTHY_PCT) {
    lines.push(
      `Signal notable : ~${Math.round(hard)}% du temps en Z4+ (intensité élevée pour la séance).`,
    );
    return;
  }

  const dominant = dominantZone(hr.zones);
  if (dominant && dominant.percent >= DOMINANT_ZONE_PCT) {
    lines.push(
      `Signal notable : majorité du temps en ${dominant.shortLabel} (${dominant.label}, ${dominant.percent}%).`,
    );
  }
}

function appendHrDecouplingFact(lines: string[], decouplingPct: number | null): void {
  if ((decouplingPct === undefined || decouplingPct === null) || Math.abs(decouplingPct) < DECOUPLING_NOTEWORTHY_PCT) {
    return;
  }
  const sign = decouplingPct > 0 ? '+' : '';
  lines.push(
    `Découplage cardiaque : ${sign}${decouplingPct.toFixed(1)}% (dérive aérobie notable au-delà de ~${DECOUPLING_NOTEWORTHY_PCT}%).`,
  );
}

function appendHrTechnicalFacts(lines: string[], input: TechnicalFactInput): void {
  const { analysis } = input;
  if (!analysis) {
    return;
  }
  appendHrZoneFacts(lines, analysis.hr, analysis.thresholds);
  appendHrDecouplingFact(lines, analysis.hr.decouplingPct);
}

function appendRunVariabilityFacts(lines: string[], analysis: ActivityAnalysis): void {
  const { run, power } = analysis;
  if ((run?.paceVariabilityPct !== undefined && run?.paceVariabilityPct !== null) && run.paceVariabilityPct >= PACE_VARIABILITY_NOTEWORTHY_PCT) {
    lines.push(`Variabilité d’allure : ${run.paceVariabilityPct.toFixed(0)}% (rythme irrégulier).`);
  }
  if ((power?.variabilityIndex !== undefined && power?.variabilityIndex !== null) && power.variabilityIndex >= VI_NOTEWORTHY) {
    lines.push(
      `Variabilité de puissance (VI) : ${power.variabilityIndex.toFixed(2)} (effort irrégulier).`,
    );
  }
}

function appendRunPowerTechnicalFacts(lines: string[], input: TechnicalFactInput): void {
  const { analysis } = input;
  if (!analysis) {
    return;
  }
  appendRunVariabilityFacts(lines, analysis);

  const { thresholds, power } = analysis;
  const summary = power?.zones?.length ? zoneSummary(power.zones) : null;
  if (!summary || !thresholds.ftp) {
    return;
  }
  const sourceLabel = thresholds.source === 'profile' ? 'profil' : 'estimé';
  lines.push(`Zones puissance (FTP ${thresholds.ftp} W · ${sourceLabel}) : ${summary}.`);
}

/**
 * Build markdown lines for the narrative prompt.
 * Returns [] when nothing clears the noteworthiness bar.
 */
export function buildTechnicalSessionFacts(input: TechnicalFactInput): string[] {
  const lines: string[] = [];
  appendHrTechnicalFacts(lines, input);
  appendRunPowerTechnicalFacts(lines, input);
  return lines;
}
