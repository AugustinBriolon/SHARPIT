import type { SessionIntensity } from '@prisma/client';

/** Intensities where whole-session avg/NP are diluted by warm-up & recovery. */
const QUALITY_INTENSITIES = new Set<SessionIntensity>(['TEMPO', 'THRESHOLD', 'VO2MAX', 'RACE']);

const DEFAULT_TARGET_PCT: Partial<Record<SessionIntensity, number>> = {
  TEMPO: 85,
  THRESHOLD: 95,
  VO2MAX: 110,
  RACE: 100,
};

/** Coggan-ish floor (% FTP) used to detect "work" samples when no tighter target exists. */
const DEFAULT_FLOOR_PCT: Partial<Record<SessionIntensity, number>> = {
  TEMPO: 75,
  THRESHOLD: 90,
  VO2MAX: 105,
  RACE: 90,
};

const ROLLING_WINDOW_SEC = 30;
const MERGE_GAP_SEC = 60;
const MIN_BLOCK_SEC = 120;

export interface PrescriptionTargets {
  ftpPct: number | null;
  reps: number | null;
  repDurationMin: number | null;
  plannedWorkMin: number | null;
}

export interface WorkBlock {
  startSec: number;
  endSec: number;
  durationSec: number;
  avgWatts: number;
  pctFtp: number;
}

export interface BikeWorkSummary {
  ftpW: number;
  targetWatts: number | null;
  targetPctFtp: number | null;
  workFloorWatts: number;
  workFloorPctFtp: number;
  totalWorkSec: number;
  workAvgWatts: number | null;
  workAvgPctFtp: number | null;
  blocks: WorkBlock[];
  plannedWorkMin: number | null;
  prescription: PrescriptionTargets;
}

/**
 * Parses free-text prescriptions like "3x15min à 85% FTP".
 * Best-effort only — never claims a full workout AST.
 */
export function parsePrescriptionTargets(
  description: string | null | undefined,
): PrescriptionTargets {
  const text = description ?? '';
  const pctMatch = text.match(/(\d{2,3})\s*%\s*(?:de\s+)?FTP/i);
  const ftpPct = pctMatch ? clampInt(Number(pctMatch[1]), 50, 150) : null;

  const repsMatch = text.match(/(\d{1,2})\s*[x×]\s*(\d{1,3})\s*(?:min|m\b)/i);
  const reps = repsMatch ? clampInt(Number(repsMatch[1]), 1, 30) : null;
  const repDurationMin = repsMatch ? clampInt(Number(repsMatch[2]), 1, 180) : null;
  const plannedWorkMin = reps !== null && repDurationMin !== null ? reps * repDurationMin : null;

  return { ftpPct, reps, repDurationMin, plannedWorkMin };
}

export function shouldAnalyzeBikeWorkBlocks(input: {
  intensity: SessionIntensity | null | undefined;
  description?: string | null;
}): boolean {
  if (input.intensity && QUALITY_INTENSITIES.has(input.intensity)) {
    return true;
  }
  const p = parsePrescriptionTargets(input.description);
  return p.ftpPct !== null || p.plannedWorkMin !== null;
}

/**
 * Detects sustained quality-power blocks from a 1 Hz (or near-1 Hz) watts series.
 * Gaps ≤ MERGE_GAP_SEC inside work are merged; short spikes (< MIN_BLOCK_SEC) are dropped from block list
 * but still counted in totalWorkSec via sample-level floor.
 */
export function summarizeBikeWorkBlocks(input: {
  watts: number[];
  ftpW: number;
  intensity?: SessionIntensity | null;
  description?: string | null;
}): BikeWorkSummary | null {
  const { watts, ftpW, intensity = null, description = null } = input;
  if (!(ftpW > 0) || watts.length < 60) {
    return null;
  }
  if (!shouldAnalyzeBikeWorkBlocks({ intensity, description })) {
    return null;
  }

  const prescription = parsePrescriptionTargets(description);
  const targetPctFtp =
    prescription.ftpPct ?? (intensity ? (DEFAULT_TARGET_PCT[intensity] ?? null) : null);
  const floorPctFtp = resolveFloorPct(intensity, targetPctFtp);
  const workFloorWatts = Math.round((floorPctFtp / 100) * ftpW);
  const targetWatts = targetPctFtp !== null ? Math.round((targetPctFtp / 100) * ftpW) : null;

  const high = markHighSamples(watts, workFloorWatts);
  const blocks = extractBlocks(watts, high, ftpW);

  let workSum = 0;
  let workCount = 0;
  for (let i = 0; i < watts.length; i++) {
    const w = watts[i] ?? 0;
    if (w >= workFloorWatts) {
      workSum += w;
      workCount += 1;
    }
  }

  const workAvgWatts = workCount > 0 ? Math.round(workSum / workCount) : null;

  return {
    ftpW,
    targetWatts,
    targetPctFtp,
    workFloorWatts,
    workFloorPctFtp: floorPctFtp,
    totalWorkSec: workCount,
    workAvgWatts,
    workAvgPctFtp: workAvgWatts !== null ? Math.round((workAvgWatts / ftpW) * 100) : null,
    blocks,
    plannedWorkMin: prescription.plannedWorkMin,
    prescription,
  };
}

/** Formats a work summary for the compliance LLM prompt. */
export function describeBikeWorkBlocks(summary: BikeWorkSummary): string {
  const lines: string[] = [
    `FTP athlète : ${summary.ftpW} W`,
    summary.targetWatts !== null && summary.targetPctFtp !== null
      ? `Cible intensité (estimée) : ${summary.targetPctFtp}% FTP ≈ ${summary.targetWatts} W`
      : null,
    `Seuil de détection des blocs de travail : ≥ ${summary.workFloorPctFtp}% FTP (${summary.workFloorWatts} W)`,
    `Temps passé au-dessus de ce seuil : ${fmtMin(summary.totalWorkSec)}`,
    summary.workAvgWatts !== null && summary.workAvgPctFtp !== null
      ? `Puissance moyenne sur ce temps de travail : ${summary.workAvgWatts} W (${summary.workAvgPctFtp}% FTP)`
      : null,
    summary.plannedWorkMin !== null
      ? `Volume de travail suggéré par la consigne (lecture texte) : ~${summary.plannedWorkMin} min — heuristique, pas une preuve structurée`
      : null,
  ].filter(Boolean) as string[];

  if (summary.blocks.length === 0) {
    lines.push(
      'Aucun bloc soutenu ≥ 2 min détecté au-dessus du seuil (échauffement/récup peuvent diluer la moyenne globale).',
    );
    return lines.join('\n');
  }

  lines.push(`Blocs soutenus détectés (≥ 2 min) : ${summary.blocks.length}`);
  for (const [i, b] of summary.blocks.entries()) {
    lines.push(
      `- Bloc ${i + 1} : ${fmtClockRange(b.startSec, b.endSec)} · ${fmtMin(b.durationSec)} · moy ${b.avgWatts} W (${b.pctFtp}% FTP)`,
    );
  }
  lines.push(
    'Note : ces blocs sont une heuristique stream (pas un parseur d’intervalles). Structure NxM exacte non garantie.',
  );
  return lines.join('\n');
}

function resolveFloorPct(intensity: SessionIntensity | null, targetPctFtp: number | null): number {
  if (targetPctFtp !== null) {
    // Allow mild undershoot vs prescription while staying in quality territory.
    return Math.max(70, targetPctFtp - 8);
  }
  if (intensity && DEFAULT_FLOOR_PCT[intensity] !== null) {
    return DEFAULT_FLOOR_PCT[intensity]!;
  }
  return 75;
}

function markHighSamples(watts: number[], floorWatts: number): boolean[] {
  const high = new Array<boolean>(watts.length).fill(false);
  let runSum = 0;
  const window: number[] = [];
  for (let i = 0; i < watts.length; i++) {
    const w = Math.max(0, watts[i] ?? 0);
    window.push(w);
    runSum += w;
    if (window.length > ROLLING_WINDOW_SEC) {
      runSum -= window.shift()!;
    }
    high[i] = runSum / window.length >= floorWatts;
  }
  return high;
}

function extractBlocks(watts: number[], high: boolean[], ftpW: number): WorkBlock[] {
  const raw: { start: number; end: number }[] = [];
  let i = 0;
  while (i < high.length) {
    while (i < high.length && !high[i]) {
      i++;
    }
    if (i >= high.length) {
      break;
    }
    const start = i;
    while (i < high.length && high[i]) {
      i++;
    }
    raw.push({ start, end: i - 1 });
  }

  // Merge gaps ≤ MERGE_GAP_SEC (brief drops inside an interval).
  const merged: { start: number; end: number }[] = [];
  for (const seg of raw) {
    const prev = merged[merged.length - 1];
    if (prev && seg.start - prev.end - 1 <= MERGE_GAP_SEC) {
      prev.end = seg.end;
    } else {
      merged.push({ ...seg });
    }
  }

  const blocks: WorkBlock[] = [];
  for (const seg of merged) {
    const durationSec = seg.end - seg.start + 1;
    if (durationSec < MIN_BLOCK_SEC) {
      continue;
    }
    let sum = 0;
    let count = 0;
    for (let t = seg.start; t <= seg.end; t++) {
      const w = watts[t] ?? 0;
      if (w > 0) {
        sum += w;
        count += 1;
      }
    }
    if (count === 0) {
      continue;
    }
    const avgWatts = Math.round(sum / count);
    blocks.push({
      startSec: seg.start,
      endSec: seg.end,
      durationSec,
      avgWatts,
      pctFtp: Math.round((avgWatts / ftpW) * 100),
    });
  }
  return blocks;
}

function clampInt(n: number, min: number, max: number): number | null {
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.min(max, Math.max(min, Math.round(n)));
}

function fmtMin(sec: number): string {
  const m = Math.round(sec / 60);
  return `${m} min`;
}

function fmtClockRange(startSec: number, endSec: number): string {
  return `${fmtClock(startSec)}→${fmtClock(endSec)}`;
}

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
