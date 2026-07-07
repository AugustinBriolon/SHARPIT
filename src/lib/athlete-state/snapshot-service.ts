import type { AthleteSnapshot, AthleteSnapshotBriefing } from '@/core/athlete-state/snapshot';
import {
  buildAthleteSnapshot,
  computeSnapshotId,
  type SnapshotBuildInput,
} from '@/lib/athlete-state/snapshot-builder';
import { computeFreshnessSnapshot } from '@/lib/athlete-state/freshness-service';
import { getDailyBriefing } from '@/lib/daily-briefing';
import {
  getLatestAthleteSnapshot,
  getSnapshotByFingerprint,
  saveAthleteSnapshot,
} from '@/infrastructure/athlete-state/snapshot-repository';
import { loadTodayState } from '@/lib/today-state-server';
import type { TodayState } from '@/hooks/use-today';

const ATHLETE_ID = 'default';

async function loadBriefingForDay(trainingDayId: string): Promise<AthleteSnapshotBriefing | null> {
  const refDate = new Date(`${trainingDayId}T12:00:00.000Z`);
  const row = await getDailyBriefing(refDate);
  if (!row) return null;
  return {
    content: row.content,
    generatedAt: row.generatedAt.toISOString(),
    readiness: row.readiness,
  };
}

export type GenerateSnapshotOptions = {
  athleteId?: string;
  trainingDayId: string;
  todayState?: TodayState;
  forceRefresh?: boolean;
  skipPersist?: boolean;
};

/**
 * Regenerate snapshot only when inference inputs changed (idempotent).
 */
export async function generateAthleteSnapshot(
  options: GenerateSnapshotOptions,
): Promise<AthleteSnapshot> {
  const athleteId = options.athleteId ?? ATHLETE_ID;
  const { trainingDayId } = options;

  const [todayState, freshness, briefing] = await Promise.all([
    options.todayState ??
      loadTodayState({
        athleteId,
        trainingDayId,
        forceRefresh: options.forceRefresh ?? false,
      }),
    computeFreshnessSnapshot({ athleteId, trainingDayId }),
    loadBriefingForDay(trainingDayId),
  ]);

  const buildInput: SnapshotBuildInput = {
    athleteId,
    trainingDayId,
    todayState,
    freshness,
    briefing,
  };

  const snapshotId = computeSnapshotId(buildInput);
  const existing = await getSnapshotByFingerprint(athleteId, trainingDayId, snapshotId);
  if (existing) return existing;

  const snapshot = buildAthleteSnapshot(buildInput);

  if (!options.skipPersist) {
    await saveAthleteSnapshot(snapshot);
  }

  return snapshot;
}

export async function getOrBuildAthleteSnapshot(trainingDayId: string): Promise<AthleteSnapshot> {
  const persisted = await getLatestAthleteSnapshot({
    athleteId: ATHLETE_ID,
    trainingDayId,
  });

  if (persisted) {
    const latestBriefing = await loadBriefingForDay(trainingDayId);
    const briefingChanged =
      latestBriefing?.generatedAt !== persisted.briefing?.generatedAt ||
      (latestBriefing && !persisted.briefing);

    if (!briefingChanged) return persisted;

    return generateAthleteSnapshot({
      trainingDayId,
      todayState: {
        reasoning: persisted.reasoning,
        recovery: persisted.recovery,
        fatigue: persisted.fatigue,
        adaptation: persisted.adaptation,
        dailyStrain: persisted.dailyStrain,
      },
      forceRefresh: false,
    });
  }

  return generateAthleteSnapshot({ trainingDayId, forceRefresh: false });
}

export async function regenerateAthleteSnapshotAfterInference(
  trainingDayId: string,
  todayState: TodayState,
): Promise<AthleteSnapshot> {
  return generateAthleteSnapshot({
    trainingDayId,
    todayState,
    forceRefresh: false,
  });
}

export async function regenerateAthleteSnapshotAfterBriefing(
  trainingDayId?: string,
): Promise<AthleteSnapshot | null> {
  const dayId = trainingDayId ?? new Date().toISOString().slice(0, 10);

  const existing = await getLatestAthleteSnapshot({
    athleteId: ATHLETE_ID,
    trainingDayId: dayId,
  });
  if (!existing) return null;

  return generateAthleteSnapshot({
    trainingDayId: dayId,
    todayState: {
      reasoning: existing.reasoning,
      recovery: existing.recovery,
      fatigue: existing.fatigue,
      adaptation: existing.adaptation,
      dailyStrain: existing.dailyStrain,
    },
    forceRefresh: false,
  });
}
