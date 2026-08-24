import { ActivityType, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { syncSinceFromLastSync } from '@/lib/integrations/shared/sync-since';
import { findMatchingActivity } from '@/lib/activity/list/activity-dedup';
import {
  buildGarminActivityData,
  fetchGarminActivityEvaluation,
  fetchGarminExerciseSets,
  garminEnrichmentUpdate,
  garminSessionDurationSec,
  mapGarminType,
  resolveGarminStrengthSets,
  type ParsedStrengthSet,
} from '@/lib/integrations/garmin/garmin-activities';
import { ensureGarminExerciseLabelsFr } from '@/lib/integrations/garmin/garmin-exercise-labels';
import { fetchGarminMultisportLegs } from '@/lib/integrations/garmin/garmin-multisport';
import {
  clientFromTokens,
  currentTokens,
  garminTokensFromStorage,
} from '@/lib/integrations/garmin/garmin';
import { getGarminAccount, runGarminCall } from '@/lib/integrations/garmin/garmin-sync';
import {
  isGarminAccountConnected,
  ProviderAuthError,
} from '@/lib/integrations/shared/connection-status';
import { resolveExerciseCatalogId, enrichStrengthExerciseVisuals } from '@/lib/exercises';
import { mapWithConcurrency } from '@/lib/async/map-with-concurrency';
import { prisma } from '@/lib/prisma';
import { observationEngine } from '@/lib/engines/observation-engine';
import {
  garminActivityToSession,
  garminEvaluationToSubjective,
} from '@/core/adapters/garmin-activity-adapter';

const ATHLETE_ID = 'default';

/** Parallel per-activity fetch/eval — keep modest (shared Garmin client + rate limits). */
export const GARMIN_ACTIVITY_CONCURRENCY = 4;

/** Fires an observation into the engine. Errors are logged but never propagate to the sync. */
async function ingestGarminActivity(
  activity: Parameters<typeof garminActivityToSession>[0],
  evaluation: Parameters<typeof garminEvaluationToSubjective>[0],
  receivedAt: Date,
): Promise<void> {
  try {
    const rawSession = garminActivityToSession(activity, receivedAt);
    if (!rawSession) return;

    await observationEngine.ingest(ATHLETE_ID, rawSession);

    const rawSubjective = garminEvaluationToSubjective(
      evaluation,
      String(activity.activityId),
      rawSession.timestamp,
      receivedAt,
    );
    if (rawSubjective) {
      await observationEngine.ingest(ATHLETE_ID, rawSubjective);
    }
  } catch (err) {
    console.error('[ObservationEngine] garmin-activity ingest failed:', err);
  }
}

const ACCOUNT_ID = 'default';
const PAGE_SIZE = 50;
/** Limite par défaut (fenêtre glissante) : ~600 activités suffisent largement. */
const MAX_PAGES = 12;
/** Mode historique complet : plafond de sécurité (~10 000 activités). */
const MAX_PAGES_FULL = 200;

async function backfillMultisportLegs(
  activityId: string,
  garminId: number,
  client: ReturnType<typeof clientFromTokens>,
): Promise<boolean> {
  const existing = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { multisportLegs: true },
  });
  if (existing?.multisportLegs != null) return false;

  const legs = await fetchGarminMultisportLegs(client, garminId);
  if (!legs) return false;

  await prisma.activity.update({
    where: { id: activityId },
    data: { multisportLegs: legs as unknown as Prisma.InputJsonValue },
  });
  return true;
}

function strengthSetsMatch(
  existing: Array<{
    exercise: string;
    sets: number;
    reps: number;
    durationSec: number | null;
    weightKg: number | null;
    order: number;
  }>,
  incoming: ParsedStrengthSet[],
): boolean {
  if (existing.length !== incoming.length) return false;
  return existing.every((row, index) => {
    const next = incoming[index];
    if (!next) return false;
    return (
      row.exercise === next.exercise &&
      row.sets === next.sets &&
      row.reps === next.reps &&
      row.durationSec === next.durationSec &&
      row.weightKg === next.weightKg &&
      row.order === next.order
    );
  });
}

/** Crée ou remplace les séries de muscu quand Garmin envoie des données différentes. */
async function backfillStrengthSets(
  activityId: string,
  sets: ParsedStrengthSet[],
): Promise<boolean> {
  if (sets.length === 0) return false;

  const existing = await prisma.strengthSet.findMany({
    where: { activityId },
    orderBy: { order: 'asc' },
  });

  if (strengthSetsMatch(existing, sets)) {
    // Sets unchanged — still fill any missing visual links (new aliases).
    await enrichStrengthExerciseVisuals(prisma, activityId);
    return false;
  }

  await prisma.$transaction([
    prisma.strengthSet.deleteMany({ where: { activityId } }),
    prisma.strengthSet.createMany({
      data: sets.map((s) => ({
        activityId,
        exercise: s.exercise,
        exerciseCatalogId: resolveExerciseCatalogId(s.exercise),
        sets: s.sets,
        reps: s.reps,
        durationSec: s.durationSec,
        weightKg: s.weightKg,
        restSec: s.restSec,
        order: s.order,
      })),
    }),
  ]);
  return true;
}

export interface GarminActivitySyncResult {
  fetched: number;
  imported: number;
  updated: number;
  merged: number;
  skipped: number;
  importedTypes: ActivityType[];
  importedActivityIds: string[];
  /** Types des séances réellement modifiées (import, merge ou update). */
  changedTypes: ActivityType[];
  /** Séances modifiées pendant la sync (pour filtrer les nouveaux records). */
  changedActivityIds: string[];
}

type GarminActivityOutcome = {
  skipped: number;
  imported: number;
  updated: number;
  merged: number;
  importedActivityIds: string[];
  importedTypes: ActivityType[];
  changed: Array<{ id: string; type: ActivityType }>;
};

const EMPTY_OUTCOME: GarminActivityOutcome = {
  skipped: 0,
  imported: 0,
  updated: 0,
  merged: 0,
  importedActivityIds: [],
  importedTypes: [],
  changed: [],
};

type GarminClient = ReturnType<typeof clientFromTokens>;
type GarminListActivity = Parameters<typeof garminActivityToSession>[0];

async function processOneGarminActivity(
  client: GarminClient,
  activity: GarminListActivity,
  exerciseLabelsFr: Map<string, string>,
): Promise<GarminActivityOutcome> {
  const garminId = String(activity.activityId);
  const type = mapGarminType(activity.activityType?.typeKey ?? '');
  if (!type) {
    return { ...EMPTY_OUTCOME, skipped: 1 };
  }

  const duration = garminSessionDurationSec(activity, type);

  const evaluation = await fetchGarminActivityEvaluation(client, activity.activityId);
  const strengthSets =
    type === ActivityType.STRENGTH
      ? resolveGarminStrengthSets(
          activity,
          await fetchGarminExerciseSets(client, activity.activityId, exerciseLabelsFr),
          exerciseLabelsFr,
        )
      : [];

  const existingByGarmin = await prisma.activity.findUnique({
    where: { garminId },
    select: { id: true, rpe: true, feeling: true, stravaId: true },
  });

  if (existingByGarmin) {
    const patch: Prisma.ActivityUpdateInput = {};
    if (evaluation.rpe != null && evaluation.rpe !== existingByGarmin.rpe) {
      patch.rpe = evaluation.rpe;
    }
    if (evaluation.feeling != null && evaluation.feeling !== existingByGarmin.feeling) {
      patch.feeling = evaluation.feeling;
    }
    if (evaluation.notes) patch.notes = evaluation.notes;

    const addedSets = await backfillStrengthSets(existingByGarmin.id, strengthSets);
    const addedLegs =
      type === ActivityType.TRIATHLON
        ? await backfillMultisportLegs(existingByGarmin.id, activity.activityId, client)
        : false;

    if (Object.keys(patch).length > 0) {
      await prisma.activity.update({
        where: { id: existingByGarmin.id },
        data: patch,
      });
      return {
        ...EMPTY_OUTCOME,
        updated: 1,
        changed: [{ id: existingByGarmin.id, type }],
      };
    }
    if (addedSets || addedLegs) {
      return {
        ...EMPTY_OUTCOME,
        updated: 1,
        changed: [{ id: existingByGarmin.id, type }],
      };
    }
    return { ...EMPTY_OUTCOME, skipped: 1 };
  }

  const fingerprint = { type, date: new Date(activity.startTimeLocal), duration, garminId };
  const match = await findMatchingActivity(fingerprint);

  if (match) {
    if (match.garminId && match.garminId !== garminId) {
      return { ...EMPTY_OUTCOME, skipped: 1 };
    }

    await prisma.activity.update({
      where: { id: match.id },
      data: garminEnrichmentUpdate(activity, evaluation, type, match.stravaId),
    });
    await backfillStrengthSets(match.id, strengthSets);
    await prisma.activityStream.deleteMany({ where: { activityId: match.id } });
    await ingestGarminActivity(activity, evaluation, new Date());
    return {
      ...EMPTY_OUTCOME,
      merged: 1,
      importedActivityIds: [match.id],
      changed: [{ id: match.id, type }],
    };
  }

  try {
    const multisportLegs =
      type === ActivityType.TRIATHLON
        ? await fetchGarminMultisportLegs(client, activity.activityId)
        : null;

    const created = await prisma.activity.create({
      data: {
        ...buildGarminActivityData(activity, evaluation, type, strengthSets),
        ...(multisportLegs
          ? { multisportLegs: multisportLegs as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
    await ingestGarminActivity(activity, evaluation, new Date());
    return {
      ...EMPTY_OUTCOME,
      imported: 1,
      importedActivityIds: [created.id],
      importedTypes: [type],
      changed: [{ id: created.id, type }],
    };
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return { ...EMPTY_OUTCOME, skipped: 1 };
    }
    throw error;
  }
}

export async function syncGarminActivities(options?: {
  /** Fenêtre en jours (fallback si jamais sync). Ignoré si `full` ou `since`. */
  sinceDays?: number;
  /** Borne basse explicite (prioritaire sur sinceDays). */
  since?: Date;
  /** Récupère tout l'historique (aucune limite de date). */
  full?: boolean;
}): Promise<GarminActivitySyncResult> {
  return runGarminCall(async () => {
    const account = await getGarminAccount();
    if (!account || !isGarminAccountConnected(account)) {
      throw new ProviderAuthError('Session Garmin expirée. Reconnecte Garmin dans les paramètres.');
    }

    const client = clientFromTokens(
      garminTokensFromStorage(account.oauth1Token, account.oauth2Token),
    );
    const exerciseLabelsFr = await ensureGarminExerciseLabelsFr();

    const full = options?.full ?? false;
    const lastActivitySync = account.lastActivitySyncAt ?? account.lastSyncAt;
    const cutoff = full
      ? null
      : (options?.since ?? syncSinceFromLastSync(lastActivitySync, options?.sinceDays ?? 60));
    const maxPages = full ? MAX_PAGES_FULL : MAX_PAGES;

    const result: GarminActivitySyncResult = {
      fetched: 0,
      imported: 0,
      updated: 0,
      merged: 0,
      skipped: 0,
      importedTypes: [],
      importedActivityIds: [],
      changedTypes: [],
      changedActivityIds: [],
    };

    const importedTypes = new Set<ActivityType>();
    const changedTypes = new Set<ActivityType>();
    const changedActivityIds = new Set<string>();

    let start = 0;

    for (let page = 0; page < maxPages; page++) {
      const batch = await client.getActivities(start, PAGE_SIZE);
      if (!batch.length) break;

      result.fetched += batch.length;
      let reachedCutoff = false;

      const toProcess: GarminListActivity[] = [];
      for (const activity of batch) {
        const date = new Date(activity.startTimeLocal);
        if (cutoff && date < cutoff) {
          reachedCutoff = true;
          break;
        }
        toProcess.push(activity);
      }

      const outcomes = await mapWithConcurrency(
        toProcess,
        GARMIN_ACTIVITY_CONCURRENCY,
        (activity) => processOneGarminActivity(client, activity, exerciseLabelsFr),
      );

      for (const outcome of outcomes) {
        result.skipped += outcome.skipped;
        result.imported += outcome.imported;
        result.updated += outcome.updated;
        result.merged += outcome.merged;
        result.importedActivityIds.push(...outcome.importedActivityIds);
        for (const type of outcome.importedTypes) importedTypes.add(type);
        for (const change of outcome.changed) {
          changedTypes.add(change.type);
          changedActivityIds.add(change.id);
        }
      }

      if (reachedCutoff || batch.length < PAGE_SIZE) break;
      start += PAGE_SIZE;
    }

    const refreshed = currentTokens(client);
    await prisma.garminAccount.update({
      where: { athleteId: ACCOUNT_ID },
      data: {
        oauth1Token: refreshed.oauth1 as unknown as Prisma.InputJsonValue,
        oauth2Token: refreshed.oauth2 as unknown as Prisma.InputJsonValue,
        lastActivitySyncAt: new Date(),
      },
    });

    result.importedTypes = [...importedTypes];
    result.changedTypes = [...changedTypes];
    result.changedActivityIds = [...changedActivityIds];
    return result;
  });
}
