import { format, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { decryptSecret, encryptSecret } from '@/lib/secret-box';
import { isMfpAccountConnected, ProviderAuthError } from '@/lib/integrations/connection-status';
import {
  MfpSessionExpiredError,
  fetchDiaryDay,
  fetchDisplayName,
  type MfpScrapedMeal,
  type MfpSession,
} from '@/lib/integrations/myfitnesspal';

type MealEntry = MfpScrapedMeal['entries'][number];

const ACCOUNT_ID = 'default';

export async function getMfpAccount() {
  return prisma.myFitnessPalAccount.findUnique({ where: { id: ACCOUNT_ID } });
}

export async function connectMfp(sessionToken: string) {
  const session: MfpSession = { sessionToken };
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  await fetchDiaryDay(session, todayStr); // validates the cookie before storing it
  const displayName = await fetchDisplayName(session);

  await prisma.myFitnessPalAccount.upsert({
    where: { id: ACCOUNT_ID },
    create: { id: ACCOUNT_ID, sessionTokenEnc: encryptSecret(sessionToken), displayName },
    update: { sessionTokenEnc: encryptSecret(sessionToken), displayName },
  });

  return { displayName };
}

export async function disconnectMfp() {
  await prisma.myFitnessPalAccount.deleteMany({ where: { id: ACCOUNT_ID } });
}

async function revokeMfpCredentials() {
  const account = await getMfpAccount();
  if (!account) return;
  await prisma.myFitnessPalAccount.update({
    where: { id: ACCOUNT_ID },
    data: { sessionTokenEnc: '' },
  });
}

export interface MfpSyncResult {
  synced: number;
  errors: number;
}

export async function syncMfpNutrition(lookbackDays = 7): Promise<MfpSyncResult> {
  const account = await getMfpAccount();
  if (!account || !isMfpAccountConnected(account)) {
    throw new ProviderAuthError(
      'Session MyFitnessPal expirée. Reconnecte MyFitnessPal dans les paramètres.',
    );
  }

  const session: MfpSession = { sessionToken: decryptSecret(account.sessionTokenEnc) };

  const today = new Date();
  let synced = 0;
  let errors = 0;

  for (let i = 0; i < lookbackDays; i++) {
    const day = subDays(today, i);
    const dateStr = format(day, 'yyyy-MM-dd');

    try {
      const result = await fetchDiaryDay(session, dateStr);
      if (result.meals.every((m: MfpScrapedMeal) => m.entries.length === 0)) continue;

      const mealSummaries = result.meals
        .filter((m: MfpScrapedMeal) => m.entries.length > 0)
        .map((m: MfpScrapedMeal) => ({
          name: m.name,
          calories: Math.round(m.entries.reduce((s: number, e: MealEntry) => s + e.calories, 0)),
          protein: Math.round(m.entries.reduce((s: number, e: MealEntry) => s + e.protein, 0)),
          carbs: Math.round(m.entries.reduce((s: number, e: MealEntry) => s + e.carbohydrates, 0)),
          fat: Math.round(m.entries.reduce((s: number, e: MealEntry) => s + e.fat, 0)),
        }));

      await prisma.dailyNutrition.upsert({
        where: {
          date_provider: {
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
    where: { id: ACCOUNT_ID },
    data: { lastSyncAt: new Date() },
  });

  return { synced, errors };
}
