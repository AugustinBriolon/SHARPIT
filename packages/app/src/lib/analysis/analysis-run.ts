/**
 * Coach analysis runs — shared vocabulary between server and client (ADR-036).
 *
 * Pure: no I/O. Every rule about what is running, what just finished, and what
 * the athlete should be told lives here so both sides agree without a second
 * implementation.
 */

export const ANALYSIS_KINDS = [
  'ACTIVITY_NARRATIVE',
  'SESSION_COMPLIANCE',
  'BRICK',
  'WEEKLY_REVIEW',
] as const;

export type AnalysisKind = (typeof ANALYSIS_KINDS)[number];

export type AnalysisRunStatus = 'RUNNING' | 'READY' | 'FAILED';

export type AnalysisRunView = {
  kind: AnalysisKind;
  targetId: string;
  status: AnalysisRunStatus;
  startedAt: string;
  finishedAt: string | null;
};

/** A run still marked RUNNING after this is presumed dead (the function was frozen). */
export const ANALYSIS_RUN_STALE_MS = 5 * 60_000;

/** Finished long before the athlete came back: worth reading, not worth a toast. */
export const ANALYSIS_NOTIFY_MAX_AGE_MS = 30 * 60_000;

/** How often the client asks again while at least one run is in flight. */
export const ANALYSIS_POLL_MS = 5_000;

const KIND_LABEL: Record<AnalysisKind, string> = {
  ACTIVITY_NARRATIVE: 'Synthèse de ta séance',
  SESSION_COMPLIANCE: 'Analyse prévu / réalisé',
  BRICK: 'Analyse de ton enchaînement',
  WEEKLY_REVIEW: 'Bilan de la semaine',
};

export function analysisKindLabel(kind: AnalysisKind): string {
  return KIND_LABEL[kind];
}

/** Where the athlete goes to read the finished analysis. */
export function analysisRunHref(run: Pick<AnalysisRunView, 'kind' | 'targetId'>): string {
  switch (run.kind) {
    case 'ACTIVITY_NARRATIVE':
      return `/activite/${run.targetId}`;
    case 'SESSION_COMPLIANCE':
      return `/plan/semaine?planned=${run.targetId}`;
    case 'BRICK':
      return '/plan/semaine';
    case 'WEEKLY_REVIEW':
      return '/plan/bilan';
  }
}

export function isAnalysisRunStale(
  run: Pick<AnalysisRunView, 'status' | 'startedAt'>,
  now: Date,
): boolean {
  if (run.status !== 'RUNNING') {
    return false;
  }
  return now.getTime() - new Date(run.startedAt).getTime() > ANALYSIS_RUN_STALE_MS;
}

/** Runs the athlete is still waiting on — a stale claim no longer counts. */
export function pendingAnalysisRuns(
  runs: readonly AnalysisRunView[],
  now: Date,
): AnalysisRunView[] {
  return runs.filter((run) => run.status === 'RUNNING' && !isAnalysisRunStale(run, now));
}

function finishedAfter(run: AnalysisRunView, watermark: string | null): boolean {
  if (!run.finishedAt) {
    return false;
  }
  return watermark === null || new Date(run.finishedAt) > new Date(watermark);
}

/**
 * Which finished runs deserve a toast, and the new watermark to remember.
 *
 * The watermark advances over every finished run, even the ones too old to
 * announce, so an athlete returning after a long absence is not greeted by a
 * stack of stale toasts.
 */
export function selectRunsToNotify(input: {
  runs: readonly AnalysisRunView[];
  watermark: string | null;
  now: Date;
}): { toNotify: AnalysisRunView[]; watermark: string | null } {
  const finished = input.runs.filter((run) => finishedAfter(run, input.watermark));
  const toNotify = finished.filter(
    (run) =>
      input.now.getTime() - new Date(run.finishedAt!).getTime() <= ANALYSIS_NOTIFY_MAX_AGE_MS,
  );
  const latest = finished.reduce<string | null>((max, run) => {
    return max === null || new Date(run.finishedAt!) > new Date(max) ? run.finishedAt! : max;
  }, input.watermark);
  return { toNotify, watermark: latest };
}

/**
 * Poll only while something is actually in flight.
 *
 * Takes the server's count rather than a client clock: React Query evaluates
 * this while building the observer, which happens during prerender, and a
 * `new Date()` there is an unstable value Next refuses.
 */
export function analysisPollInterval(pending: number | undefined): number | false {
  return pending && pending > 0 ? ANALYSIS_POLL_MS : false;
}

export type AnalysisRunsPayload = {
  runs: AnalysisRunView[];
  /** Runs still in flight, counted server-side. */
  pending: number;
};
