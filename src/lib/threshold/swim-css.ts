/**
 * Athlete-level critical swim speed, derived from the CSS Garmin already computes
 * on each pool session.
 *
 * CSS is the swimmer's threshold — the equivalent of threshold pace on land and
 * FTP on the bike — so it belongs on the profile, not scattered across realised
 * activities. Deriving it keeps the reference moving with the athlete, the way
 * the other thresholds do (ADR-012).
 */

/** One realised swim, as far as this estimate is concerned. */
export type SwimCssSample = {
  cssSecPer100m: number;
  distanceM: number;
  /** ISO date of the session. */
  date: string;
};

/**
 * Below this, a session is technique work or a warm-up fragment: its CSS reflects
 * drills and rests rather than sustainable speed.
 */
export const SWIM_CSS_MIN_DISTANCE_M = 800;

/** CSS must move by at least this many s/100 m to be worth suggesting. */
export const CSS_MATERIALITY_SEC_PER_100M = 2;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function ageDays(iso: string, now: Date): number {
  return (now.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Median CSS across qualifying sessions in the window.
 *
 * Median rather than best: the best swim of a season overstates what the athlete
 * can hold and would prescribe every set too fast. Median rather than mean: one
 * technique-heavy session should not drag the reference.
 */
export function estimateSwimCss(
  samples: SwimCssSample[],
  options: { windowDays: number; now?: Date },
): number | null {
  const now = options.now ?? new Date();

  const usable = samples
    .filter((sample) => sample.distanceM >= SWIM_CSS_MIN_DISTANCE_M)
    .filter((sample) => sample.cssSecPer100m > 0)
    .filter((sample) => {
      const age = ageDays(sample.date, now);
      return age >= 0 && age <= options.windowDays;
    })
    .map((sample) => sample.cssSecPer100m);

  if (usable.length === 0) return null;
  return Math.round(median(usable) * 10) / 10;
}

/** Only suggest a revision the athlete would actually feel in the water. */
export function shouldSuggestSwimCss(current: number | null, estimate: number | null): boolean {
  if (estimate == null) return false;
  if (current == null) return true;
  return Math.abs(current - estimate) >= CSS_MATERIALITY_SEC_PER_100M;
}

/** Athlete-facing swim pace, e.g. "1:38/100m". */
export function fmtCssSecPer100m(secPer100m: number): string {
  const total = Math.round(secPer100m);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}/100m`;
}
