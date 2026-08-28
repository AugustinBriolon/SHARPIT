/**
 * Athlete-level critical swim speed, estimated from realised pool sessions.
 *
 * CSS is the swimmer's threshold — the equivalent of threshold pace on land and
 * FTP on the bike — so it belongs on the profile rather than scattered across
 * activities, and it should move with the athlete the way the others do
 * (ADR-012).
 *
 * The estimate is a proxy, not a measurement. Properly, CSS comes from two time
 * trials: (400 - 200) / (T400 - T200). Nothing in the database records a time
 * trial, so this reads the average swim pace of long sessions instead, and takes
 * the fastest — see ADR-021 for why that direction, and for what would replace it.
 */

/** One realised swim, as far as this estimate is concerned. */
export type SwimCssSample = {
  /** Average pace of the session, seconds per 100 m. */
  paceSecPer100m: number;
  distanceM: number;
  /** ISO date of the session. */
  date: string;
};

/**
 * Below this, a session is technique work or a warm-up fragment: its average pace
 * reflects drills and rests rather than sustainable speed.
 */
export const SWIM_CSS_MIN_DISTANCE_M = 800;

/** CSS must move by at least this many s/100 m to be worth suggesting. */
export const CSS_MATERIALITY_SEC_PER_100M = 2;

function ageDays(iso: string, now: Date): number {
  return (now.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

/** Below this many qualifying sessions, there is nothing to trim against. */
const MIN_SAMPLES_TO_TRIM = 3;

/**
 * Second-fastest average pace across qualifying sessions in the window.
 *
 * Two biases pull in opposite directions and neither is small. A whole-session
 * average mixes warm-up, drills and rest into the number, so it reads slower than
 * the pace the athlete can hold — which argues for taking the fastest session.
 * But a single mis-recorded session, a short-course swim or a set with fins reads
 * far faster than anything real, and taking the fastest lets one such record set
 * the threshold. On this athlete's history the fastest session sits twenty
 * seconds per 100 m clear of the next four, which are tightly clustered.
 *
 * Taking the second-fastest keeps most of the first correction while requiring
 * two sessions to agree before the reference moves. Prescribing too fast is the
 * dangerous direction; this errs slow, which is the recoverable one.
 */
export function estimateSwimCss(
  samples: SwimCssSample[],
  options: { windowDays: number; now?: Date },
): number | null {
  const now = options.now ?? new Date();

  const usable = samples
    .filter((sample) => sample.distanceM >= SWIM_CSS_MIN_DISTANCE_M)
    .filter((sample) => sample.paceSecPer100m > 0)
    .filter((sample) => {
      const age = ageDays(sample.date, now);
      return age >= 0 && age <= options.windowDays;
    })
    .map((sample) => sample.paceSecPer100m)
    .sort((a, b) => a - b);

  if (usable.length === 0) {
    return null;
  }
  const chosen = usable.length >= MIN_SAMPLES_TO_TRIM ? usable[1] : usable[0];
  return Math.round(chosen * 10) / 10;
}

/** Only suggest a revision the athlete would actually feel in the water. */
export function shouldSuggestSwimCss(current: number | null, estimate: number | null): boolean {
  if ((estimate === undefined || estimate === null)) {
    return false;
  }
  if ((current === undefined || current === null)) {
    return true;
  }
  return Math.abs(current - estimate) >= CSS_MATERIALITY_SEC_PER_100M;
}

/** Athlete-facing swim pace, e.g. "1:38/100m". */
export function fmtCssSecPer100m(secPer100m: number): string {
  const total = Math.round(secPer100m);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}/100m`;
}
