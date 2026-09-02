import { addDays } from 'date-fns';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { providerCredentialClearData, purgeEligibleBefore } from '@/lib/privacy/consent';
import { PRIVACY_PURGE_DELAY_DAYS } from '@/lib/privacy/constants';
import { logSafeError } from '@/lib/privacy/safe-log';

export type SoftDeleteResult = {
  athleteId: string;
  deletedAt: Date;
  purgeAfter: Date;
};

/**
 * Immediate soft-delete. Profile is blocked from app use; hard purge after 30 days.
 * Clears provider Enc credentials immediately so sync cannot continue during retention.
 */
export async function softDeleteAthlete(
  athleteId: string,
  now = new Date(),
): Promise<SoftDeleteResult> {
  const updated = await prisma.$transaction(async (tx) => {
    const profile = await tx.athleteProfile.update({
      where: { id: athleteId },
      data: { deletedAt: now },
      select: { id: true, deletedAt: true },
    });

    await Promise.all([
      tx.garminAccount.updateMany({
        where: { athleteId },
        data: providerCredentialClearData.garmin,
      }),
      tx.stravaAccount.updateMany({
        where: { athleteId },
        data: providerCredentialClearData.strava,
      }),
      tx.googleAccount.updateMany({
        where: { athleteId },
        data: providerCredentialClearData.google,
      }),
      tx.withingsAccount.updateMany({
        where: { athleteId },
        data: providerCredentialClearData.withings,
      }),
      tx.renphoAccount.updateMany({
        where: { athleteId },
        data: providerCredentialClearData.renpho,
      }),
      tx.myFitnessPalAccount.updateMany({
        where: { athleteId },
        data: providerCredentialClearData.myfitnesspal,
      }),
    ]);

    return profile;
  });

  const deletedAt = updated.deletedAt ?? now;
  return {
    athleteId: updated.id,
    deletedAt,
    purgeAfter: addDays(deletedAt, PRIVACY_PURGE_DELAY_DAYS),
  };
}

/**
 * Hard-deletes soft-deleted profiles whose deletedAt is older than the retention
 * window. Cascade removes tenant data via Prisma relations. Also deletes the
 * Clerk user so auth identity does not outlive DB data (eng brief §4).
 *
 * Hook: GET /api/cron/privacy-purge (Bearer CRON_SECRET), scheduled in vercel.json.
 */
export async function purgeSoftDeletedAthletes(now = new Date()): Promise<{ purged: string[] }> {
  const cutoff = purgeEligibleBefore(now, PRIVACY_PURGE_DELAY_DAYS);
  const due = await prisma.athleteProfile.findMany({
    where: {
      deletedAt: { not: null, lte: cutoff },
    },
    select: { id: true, clerkUserId: true },
  });

  const purged: string[] = [];
  for (const row of due) {
    try {
      const client = await clerkClient();
      await client.users.deleteUser(row.clerkUserId);
    } catch (error) {
      // Continue DB purge even if Clerk identity is already gone.
      logSafeError('privacy/purge-clerk', error, { athleteId: row.id });
    }
    await prisma.athleteProfile.delete({ where: { id: row.id } });
    purged.push(row.id);
  }
  return { purged };
}
