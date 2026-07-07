import { ActivityType, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { syncSinceFromLastSync } from '@/lib/integrations/sync-since';
import { findMatchingActivity } from '@/lib/activity-dedup';
import {
  buildGarminActivityData,
  fetchGarminActivityEvaluation,
  fetchGarminExerciseSets,
  garminEnrichmentUpdate,
  garminSessionDurationSec,
  mapGarminType,
  type ParsedStrengthSet,
} from '@/lib/integrations/garmin-activities';
import { fetchGarminMultisportLegs } from '@/lib/integrations/garmin-multisport';
import {
  clientFromTokens,
  currentTokens,
  garminTokensFromStorage,
} from '@/lib/integrations/garmin';
import { getGarminAccount } from '@/lib/integrations/garmin-sync';
import { prisma } from '@/lib/prisma';
import { autoLinkActivities } from '@/lib/session-linking';
import { observationEngine } from '@/lib/engines/observation-engine';
import {
  garminActivityToSession,
  garminEvaluationToSubjective,
} from '@/core/adapters/garmin-activity-adapter';

const ATHLETE_ID = 'default';

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

/** Crée les séries de muscu si l'activité n'en a pas encore. Renvoie true si ajout. */
async function backfillStrengthSets(
  activityId: string,
  sets: ParsedStrengthSet[],
): Promise<boolean> {
  if (sets.length === 0) return false;
  const count = await prisma.strengthSet.count({ where: { activityId } });
  if (count > 0) return false;
  await prisma.strengthSet.createMany({
    data: sets.map((s) => ({
      activityId,
      exercise: s.exercise,
      sets: s.sets,
      reps: s.reps,
      weightKg: s.weightKg,
      restSec: s.restSec,
      order: s.order,
    })),
  });
  return true;
}

export interface GarminActivitySyncResult {
  fetched: number;
  imported: number;
  updated: number;
  merged: number;
  skipped: number;
  importedActivityIds: string[];
}

export async function syncGarminActivities(options?: {
  /** Fenêtre en jours (fallback si jamais sync). Ignoré si `full` ou `since`. */
  sinceDays?: number;
  /** Borne basse explicite (prioritaire sur sinceDays). */
  since?: Date;
  /** Récupère tout l'historique (aucune limite de date). */
  full?: boolean;
}): Promise<GarminActivitySyncResult> {
  const account = await getGarminAccount();
  if (!account) throw new Error('Compte Garmin non connecté');

  const client = clientFromTokens(
    garminTokensFromStorage(account.oauth1Token, account.oauth2Token),
  );

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
    importedActivityIds: [],
  };

  let start = 0;

  for (let page = 0; page < maxPages; page++) {
    const batch = await client.getActivities(start, PAGE_SIZE);
    if (!batch.length) break;

    result.fetched += batch.length;
    let reachedCutoff = false;

    for (const activity of batch) {
      const date = new Date(activity.startTimeLocal);
      if (cutoff && date < cutoff) {
        reachedCutoff = true;
        break;
      }

      const garminId = String(activity.activityId);
      const type = mapGarminType(activity.activityType?.typeKey ?? '');
      if (!type) {
        result.skipped += 1;
        continue;
      }

      const duration = garminSessionDurationSec(activity, type);

      const evaluation = await fetchGarminActivityEvaluation(client, activity.activityId);
      const strengthSets =
        type === ActivityType.STRENGTH
          ? await fetchGarminExerciseSets(client, activity.activityId)
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
          result.updated += 1;
        } else if (addedSets || addedLegs) {
          result.updated += 1;
        } else {
          result.skipped += 1;
        }
        continue;
      }

      const fingerprint = { type, date, duration, garminId };
      const match = await findMatchingActivity(fingerprint);

      if (match) {
        if (match.garminId && match.garminId !== garminId) {
          result.skipped += 1;
          continue;
        }

        await prisma.activity.update({
          where: { id: match.id },
          data: garminEnrichmentUpdate(activity, evaluation, type, match.stravaId),
        });
        await backfillStrengthSets(match.id, strengthSets);
        await prisma.activityStream.deleteMany({ where: { activityId: match.id } });
        result.merged += 1;
        result.importedActivityIds.push(match.id);
        await ingestGarminActivity(activity, evaluation, new Date());
        continue;
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
        result.imported += 1;
        result.importedActivityIds.push(created.id);
        await ingestGarminActivity(activity, evaluation, new Date());
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
          result.skipped += 1;
          continue;
        }
        throw error;
      }
    }

    if (reachedCutoff || batch.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  const refreshed = currentTokens(client);
  await prisma.garminAccount.update({
    where: { id: ACCOUNT_ID },
    data: {
      oauth1Token: refreshed.oauth1 as unknown as Prisma.InputJsonValue,
      oauth2Token: refreshed.oauth2 as unknown as Prisma.InputJsonValue,
      lastActivitySyncAt: new Date(),
    },
  });

  if (result.importedActivityIds.length > 0) {
    await autoLinkActivities(result.importedActivityIds);
  }

  return result;
}
