import { format, subDays } from 'date-fns';
import { mfpDayToNutritionObservation } from '@/core/adapters/myfitnesspal-adapter';
import { observationEngine } from '@/lib/engines/observation-engine';
import { prisma } from '@/lib/prisma';
import { decryptSecret, encryptSecret, isSecretAuthenticityFailure } from '@/lib/secret-box';
import {
  isDecryptMalformedSoftFailure,
  isMfpAccountConnected,
  ProviderAuthError,
} from '@/lib/integrations/shared/connection-status';
import {
  MfpSessionExpiredError,
  fetchDiaryDay,
  fetchDisplayName,
  fetchNutrientGoals,
  refreshMfpSession,
  type MfpDayResult,
  type MfpScrapedMeal,
  type MfpSession,
} from '@/lib/integrations/myfitnesspal/myfitnesspal';

type MealEntry = MfpScrapedMeal['entries'][number];

export async function getMfpAccount(athleteId: string) {
  return prisma.myFitnessPalAccount.findUnique({ where: { athleteId } });
}

export async function connectMfp(athleteId: string, sessionToken: string) {
  const session: MfpSession = { sessionToken };
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  await fetchDiaryDay(session, todayStr); // validates the cookie before storing it
  const displayName = await fetchDisplayName(session);

  await prisma.myFitnessPalAccount.upsert({
    where: { athleteId },
    create: { athleteId, sessionTokenEnc: encryptSecret(sessionToken), displayName },
    update: { sessionTokenEnc: encryptSecret(sessionToken), displayName },
  });

  return { displayName };
}

export async function disconnectMfp(athleteId: string) {
  await prisma.myFitnessPalAccount.deleteMany({ where: { athleteId } });
}

async function revokeMfpCredentials(athleteId: string) {
  const account = await getMfpAccount(athleteId);
  if (!account) {
    return;
  }
  await prisma.myFitnessPalAccount.update({
    where: { athleteId },
    data: { sessionTokenEnc: '' },
  });
}

/**
 * Rolls the stored cookie forward so the ~30-day expiry never lands on the user.
 *
 * Persists only when MFP actually hands back a new token, keeping sync a read for
 * the common case where the session is still inside next-auth's update window.
 */
async function rollSessionForward(athleteId: string, session: MfpSession): Promise<MfpSession> {
  const refreshed = await refreshMfpSession(session);
  if (!refreshed.rotated) {
    return session;
  }

  await prisma.myFitnessPalAccount.update({
    where: { athleteId },
    data: { sessionTokenEnc: encryptSecret(refreshed.sessionToken) },
  });

  return { sessionToken: refreshed.sessionToken };
}

/**
 * Mirrors the diary day into the observation registry, the source of truth every
 * other provider already feeds.
 *
 * Failures are logged and swallowed: nutrition must never be the reason a sync
 * that already produced a usable DailyNutrition row reports an error.
 */
async function ingestNutritionObservation(athleteId: string, day: MfpDayResult): Promise<void> {
  try {
    const raw = mfpDayToNutritionObservation(day, new Date());
    if (!raw) {
      return;
    }
    await observationEngine.ingest(athleteId, raw);
  } catch (err) {
    console.error('[ObservationEngine] myfitnesspal ingest failed:', err);
  }
}

export interface MfpSyncResult {
  synced: number;
  errors: number;
}

export async function getLiveNutrientGoals(athleteId: string, dateStr: string) {
  const account = await getMfpAccount(athleteId);
  if (!account || !isMfpAccountConnected(account)) {
    return null;
  }

  try {
    const session: MfpSession = { sessionToken: decryptSecret(account.sessionTokenEnc) };
    return await fetchNutrientGoals(session, dateStr);
  } catch {
    return null;
  }
}

function buildMfpMealSummaries(result: MfpDayResult) {
  return result.meals
    .filter((m: MfpScrapedMeal) => m.entries.length > 0)
    .map((m: MfpScrapedMeal) => ({
      name: m.name,
      calories: Math.round(m.entries.reduce((s: number, e: MealEntry) => s + e.calories, 0)),
      protein: Math.round(m.entries.reduce((s: number, e: MealEntry) => s + e.protein, 0)),
      carbs: Math.round(m.entries.reduce((s: number, e: MealEntry) => s + e.carbohydrates, 0)),
      fat: Math.round(m.entries.reduce((s: number, e: MealEntry) => s + e.fat, 0)),
      entries: m.entries.map((e: MealEntry) => ({
        name: e.name,
        calories: Math.round(e.calories),
        protein: Math.round(e.protein * 10) / 10,
        carbs: Math.round(e.carbohydrates * 10) / 10,
        fat: Math.round(e.fat * 10) / 10,
        sugar: Math.round(e.sugar * 10) / 10,
        fiber: Math.round(e.fiber * 10) / 10,
      })),
    }));
}

function mfpNutritionTotals(result: MfpDayResult) {
  return {
    calories: Math.round(result.totals.calories),
    protein: Math.round(result.totals.protein * 10) / 10,
    carbohydrates: Math.round(result.totals.carbohydrates * 10) / 10,
    fat: Math.round(result.totals.fat * 10) / 10,
    sugar: Math.round(result.totals.sugar * 10) / 10,
    fiber: Math.round(result.totals.fiber * 10) / 10,
  };
}

function mfpMacroGoalFields(goals: MfpDayResult['goals']) {
  if (!goals) {
    return {
      goalCalories: null,
      goalProtein: null,
      goalCarbohydrates: null,
      goalFat: null,
    };
  }
  return {
    goalCalories: goals.calories,
    goalProtein: goals.protein,
    goalCarbohydrates: goals.carbohydrates,
    goalFat: goals.fat,
  };
}

function mfpNutritionGoals(result: MfpDayResult) {
  return {
    ...mfpMacroGoalFields(result.goals),
    exerciseCalories: result.exerciseCalories,
  };
}

function mfpNutritionSharedFields(result: MfpDayResult) {
  return {
    ...mfpNutritionTotals(result),
    meals: buildMfpMealSummaries(result),
    complete: result.complete,
    ...mfpNutritionGoals(result),
  };
}

function mfpDailyNutritionPayload(athleteId: string, dateStr: string, result: MfpDayResult) {
  const shared = mfpNutritionSharedFields(result);
  const date = new Date(`${dateStr}T00:00:00Z`);
  return {
    where: {
      athleteId_date_provider: {
        athleteId,
        date,
        provider: 'myfitnesspal' as const,
      },
    },
    create: {
      athleteId,
      date,
      provider: 'myfitnesspal' as const,
      ...shared,
    },
    update: shared,
  };
}

async function syncMfpDay(
  athleteId: string,
  session: MfpSession,
  dateStr: string,
): Promise<boolean> {
  const result = await fetchDiaryDay(session, dateStr);
  const hasMeals = result.meals.some((m: MfpScrapedMeal) => m.entries.length > 0);
  if (!hasMeals && !result.goals) {
    return false;
  }

  await ingestNutritionObservation(athleteId, result);
  await prisma.dailyNutrition.upsert(mfpDailyNutritionPayload(athleteId, dateStr, result));
  return true;
}

async function syncMfpLookbackDays(
  athleteId: string,
  session: MfpSession,
  lookbackDays: number,
): Promise<{ synced: number; errors: number }> {
  const today = new Date();
  let synced = 0;
  let errors = 0;

  for (let i = 0; i < lookbackDays; i++) {
    const dateStr = format(subDays(today, i), 'yyyy-MM-dd');
    try {
      if (await syncMfpDay(athleteId, session, dateStr)) {
        synced++;
      }
    } catch (err) {
      if (err instanceof MfpSessionExpiredError) {
        await revokeMfpCredentials(athleteId);
        throw new ProviderAuthError(
          'Session MyFitnessPal expirée. Reconnecte MyFitnessPal dans les paramètres.',
        );
      }
      console.error(`[MFP] sync error for ${dateStr}:`, err);
      errors++;
    }
  }

  return { synced, errors };
}

function readMfpSessionOrThrow(sessionTokenEnc: string): MfpSession {
  try {
    return { sessionToken: decryptSecret(sessionTokenEnc) };
  } catch (error) {
    if (isSecretAuthenticityFailure(error)) {
      throw error;
    }
    if (isDecryptMalformedSoftFailure(error)) {
      throw new ProviderAuthError(
        'Session MyFitnessPal expirée. Reconnecte MyFitnessPal dans les paramètres.',
        { cause: error },
      );
    }
    throw error;
  }
}

export async function syncMfpNutrition(
  athleteId: string,
  lookbackDays = 7,
): Promise<MfpSyncResult> {
  const account = await getMfpAccount(athleteId);
  if (!account || !isMfpAccountConnected(account)) {
    return { synced: 0, errors: 0 };
  }

  let session: MfpSession;
  try {
    session = readMfpSessionOrThrow(account.sessionTokenEnc);
  } catch (error) {
    if (error instanceof ProviderAuthError && isDecryptMalformedSoftFailure(error.cause)) {
      await revokeMfpCredentials(athleteId);
    }
    throw error;
  }

  try {
    session = await rollSessionForward(athleteId, session);
  } catch (err) {
    console.error('[MFP] session refresh failed, syncing with the stored cookie:', err);
  }

  const { synced, errors } = await syncMfpLookbackDays(athleteId, session, lookbackDays);

  await prisma.myFitnessPalAccount.update({
    where: { athleteId },
    data: { lastSyncAt: new Date() },
  });

  return { synced, errors };
}
