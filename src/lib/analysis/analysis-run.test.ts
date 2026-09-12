import { describe, expect, it } from 'vitest';
import {
  ANALYSIS_POLL_MS,
  analysisPollInterval,
  analysisRunHref,
  isAnalysisRunStale,
  pendingAnalysisRuns,
  selectRunsToNotify,
  type AnalysisRunView,
} from './analysis-run';

const NOW = new Date('2026-09-12T10:00:00.000Z');

function minutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

function run(overrides: Partial<AnalysisRunView> = {}): AnalysisRunView {
  return {
    kind: 'ACTIVITY_NARRATIVE',
    targetId: 'activity-1',
    status: 'RUNNING',
    startedAt: minutesAgo(1),
    finishedAt: null,
    ...overrides,
  };
}

describe('analysisRunHref', () => {
  it('points at the surface that shows the finished analysis', () => {
    expect(analysisRunHref({ kind: 'ACTIVITY_NARRATIVE', targetId: 'a1' })).toBe('/activite/a1');
    expect(analysisRunHref({ kind: 'SESSION_COMPLIANCE', targetId: 's1' })).toBe(
      '/plan/semaine?planned=s1',
    );
    expect(analysisRunHref({ kind: 'WEEKLY_REVIEW', targetId: '2026-09-07' })).toBe('/plan/bilan');
  });
});

describe('isAnalysisRunStale', () => {
  it('presumes a long-running claim dead so it can be taken over', () => {
    expect(isAnalysisRunStale(run({ startedAt: minutesAgo(2) }), NOW)).toBe(false);
    expect(isAnalysisRunStale(run({ startedAt: minutesAgo(10) }), NOW)).toBe(true);
  });

  it('never calls a finished run stale', () => {
    const finished = run({
      status: 'READY',
      startedAt: minutesAgo(90),
      finishedAt: minutesAgo(88),
    });
    expect(isAnalysisRunStale(finished, NOW)).toBe(false);
  });
});

describe('pendingAnalysisRuns', () => {
  it('counts only what the athlete is still waiting on', () => {
    const runs = [
      run({ targetId: 'live' }),
      run({ targetId: 'dead', startedAt: minutesAgo(30) }),
      run({ targetId: 'done', status: 'READY', finishedAt: minutesAgo(1) }),
    ];
    expect(pendingAnalysisRuns(runs, NOW).map((r) => r.targetId)).toEqual(['live']);
  });
});

describe('selectRunsToNotify', () => {
  it('announces runs finished since the last time, once', () => {
    const runs = [run({ status: 'READY', finishedAt: minutesAgo(2) })];
    const first = selectRunsToNotify({ runs, watermark: null, now: NOW });

    expect(first.toNotify).toHaveLength(1);
    expect(first.watermark).toBe(minutesAgo(2));

    const second = selectRunsToNotify({ runs, watermark: first.watermark, now: NOW });
    expect(second.toNotify).toEqual([]);
  });

  it('announces a failure too', () => {
    const runs = [run({ status: 'FAILED', finishedAt: minutesAgo(1) })];
    expect(selectRunsToNotify({ runs, watermark: null, now: NOW }).toNotify).toHaveLength(1);
  });

  it('skips what finished long ago but still moves the watermark past it', () => {
    const runs = [run({ status: 'READY', finishedAt: minutesAgo(45) })];
    const result = selectRunsToNotify({ runs, watermark: null, now: NOW });

    expect(result.toNotify).toEqual([]);
    expect(result.watermark).toBe(minutesAgo(45));
  });

  it('ignores runs still in flight', () => {
    expect(selectRunsToNotify({ runs: [run()], watermark: null, now: NOW })).toEqual({
      toNotify: [],
      watermark: null,
    });
  });
});

describe('analysisPollInterval', () => {
  it('polls only while the server reports something in flight', () => {
    expect(analysisPollInterval(1)).toBe(ANALYSIS_POLL_MS);
    expect(analysisPollInterval(0)).toBe(false);
    expect(analysisPollInterval(undefined)).toBe(false);
  });
});
