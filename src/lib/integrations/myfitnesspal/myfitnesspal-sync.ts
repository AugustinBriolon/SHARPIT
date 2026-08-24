import { format, subDays } from 'date-fns';
import { mfpDayToNutritionObservation } from '@/core/adapters/myfitnesspal-adapter';
import { observationEngine } from '@/lib/engines/observation-engine';
import { prisma } from '@/lib/prisma';
import { decryptSecret, encryptSecret } from '@/lib/secret-box';
import {
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

const ACCOUNT_ID = 'default';
const ATHLETE_ID = 'default';

export async function getMfpAccount() {
  return prisma.myFitnessPalAccount.findUnique({ where: { athleteId: ACCOUNT_ID } });
}

export async function connectMfp(sessionToken: string) {
  const session: MfpSession = { sessionToken };
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  await fetchDiaryDay(session, todayStr); // validates the cookie before storing it
  const displayName = await fetchDisplayName(session);

  await prisma.myFitnessPalAccount.upsert({
    where: { athleteId: ACCOUNT_ID },
    create: { athleteId: ACCOUNT_ID, sessionTokenEnc: encryptSecret(sessionToken), displayName },
    update: { sessionTokenEnc: encryptSecret(sessionToken), displayName },
  });

  return { displayName };
}

export async function disconnectMfp() {
  await prisma.myFitnessPalAccount.deleteMany({ where: { athleteId: ACCOUNT_ID } });
}

async function revokeMfpCredentials() {
  const account = await getMfpAccount();
  if (!account) return;
  await prisma.myFitnessPalAccount.update({
    where: { athleteId: ACCOUNT_ID },
    data: { sessionTokenEnc: '' },
  });
}

/**
 * Rolls the stored cookie forward so the ~30-day expiry never lands on the user.
 *
 * Persists only when MFP actually hands back a new token, keeping sync a read for
 * the common case where the session is still inside next-auth's update window.
 */
async function rollSessionForward(session: MfpSession): Promise<MfpSession> {
  const refreshed = await refreshMfpSession(session);
  if (!refreshed.rotated) return session;

  await prisma.myFitnessPalAccount.update({
    where: { athleteId: ACCOUNT_ID },
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
async function ingestNutritionObservation(day: MfpDayResult): Promise<void> {
  try {
    const raw = mfpDayToNutritionObservation(day, new Date());
    if (!raw) return;
    await observationEngine.ingest(ATHLETE_ID, raw);
  } catch (err) {
    console.error('[ObservationEngine] myfitnesspal ingest failed:', err);
  }
}

export interface MfpSyncResult {
  synced: number;
  errors: number;
}

export async function getLiveNutrientGoals(dateStr: string) {
  const account = await getMfpAccount();
  if (!account || !isMfpAccountConnected(account)) return null;

  const session: MfpSession = { sessionToken: decryptSecret(account.sessionTokenEnc) };
  try {
    return await fetchNutrientGoals(session, dateStr);
  } catch {
    return null;
  }
}

export async function syncMfpNutrition(lookbackDays = 7): Promise<MfpSyncResult> {
  const account = await getMfpAccount();
  if (!account || !isMfpAccountConnected(account)) {
    throw new ProviderAuthError(
      'Session MyFitnessPal expirée. Reconnecte MyFitnessPal dans les paramètres.',
    );
  }

  let session: MfpSession = { sessionToken: decryptSecret(account.sessionTokenEnc) };

  try {
    session = await rollSessionForward(session);
  } catch (err) {
    // Never destructive: the refresh is an optimisation, and it cannot tell a
    // dead cookie apart from a bad minute at the edge. Expiry is decided by the
    // diary reads below, which answer 401/403 when the credential is truly gone.
    console.error('[MFP] session refresh failed, syncing with the stored cookie:', err);
  }

  const today = new Date();
  let synced = 0;
  let errors = 0;

  for (let i = 0; i < lookbackDays; i++) {
    const day = subDays(today, i);
    const dateStr = format(day, 'yyyy-MM-dd');

    try {
      const result = await fetchDiaryDay(session, dateStr);
      const hasMeals = result.meals.some((m: MfpScrapedMeal) => m.entries.length > 0);
      if (!hasMeals && !result.goals) continue;

      await ingestNutritionObservation(result);

      const mealSummaries = result.meals
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

      await prisma.dailyNutrition.upsert({
        where: {
          athleteId_date_provider: {
            athleteId: 'default',
            date: new Date(`${dateStr}T00:00:00Z`),
            provider: 'myfitnesspal',
          },
        },
        create: {
          date: new Date(`${dateStr}T00:00:00Z`),
          provider: 'myfitnesspal',
          calories: Math.round(result.totals.calories),
          protein: Math.round(result.totals.protein * 10) / 10,
          carbohydrates: Math.round(result.totals.carbohydrates * 10) / 10,
          fat: Math.round(result.totals.fat * 10) / 10,
          sugar: Math.round(result.totals.sugar * 10) / 10,
          fiber: Math.round(result.totals.fiber * 10) / 10,
          meals: mealSummaries,
          complete: result.complete,
          goalCalories: result.goals?.calories ?? null,
          goalProtein: result.goals?.protein ?? null,
          goalCarbohydrates: result.goals?.carbohydrates ?? null,
          goalFat: result.goals?.fat ?? null,
          exerciseCalories: result.exerciseCalories,
        },
        update: {
          calories: Math.round(result.totals.calories),
          protein: Math.round(result.totals.protein * 10) / 10,
          carbohydrates: Math.round(result.totals.carbohydrates * 10) / 10,
          fat: Math.round(result.totals.fat * 10) / 10,
          sugar: Math.round(result.totals.sugar * 10) / 10,
          fiber: Math.round(result.totals.fiber * 10) / 10,
          meals: mealSummaries,
          complete: result.complete,
          goalCalories: result.goals?.calories ?? null,
          goalProtein: result.goals?.protein ?? null,
          goalCarbohydrates: result.goals?.carbohydrates ?? null,
          goalFat: result.goals?.fat ?? null,
          exerciseCalories: result.exerciseCalories,
        },
      });
      synced++;
    } catch (err) {
      if (err instanceof MfpSessionExpiredError) {
        await revokeMfpCredentials();
        throw new ProviderAuthError(
          'Session MyFitnessPal expirée. Reconnecte MyFitnessPal dans les paramètres.',
        );
      }
      console.error(`[MFP] sync error for ${dateStr}:`, err);
      errors++;
    }
  }

  await prisma.myFitnessPalAccount.update({
    where: { athleteId: ACCOUNT_ID },
    data: { lastSyncAt: new Date() },
  });

  return { synced, errors };
}
