import { addDays } from 'date-fns';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { purgeEligibleBefore } from '@/lib/privacy/consent';
import { PRIVACY_PURGE_DELAY_DAYS } from '@/lib/privacy/constants';
import { logSafeError } from '@/lib/privacy/safe-log';

export type SoftDeleteResult = {
  athleteId: string;
  deletedAt: Date;
  purgeAfter: Date;
};

/**
 * Wipe encrypted provider credentials immediately on soft-delete so sync cannot
 * continue during the J+30 retention window. Empty strings are not live AES-GCM
 * secrets — connection-status treats the account as disconnected.
 */
export async function clearAthleteProviderCredentials(athleteId: string): Promise<void> {
  await prisma.$transaction([
    prisma.garminAccount.updateMany({
      where: { athleteId },
      data: { oauth1TokenEnc: '', oauth2TokenEnc: '' },
    }),
    prisma.stravaAccount.updateMany({
      where: { athleteId },
      data: { accessTokenEnc: '', refreshTokenEnc: '' },
    }),
    prisma.googleAccount.updateMany({
      where: { athleteId },
      data: { accessTokenEnc: '', refreshTokenEnc: '' },
    }),
    prisma.withingsAccount.updateMany({
      where: { athleteId },
      data: { accessTokenEnc: '', refreshTokenEnc: '' },
    }),
    prisma.renphoAccount.updateMany({
      where: { athleteId },
      data: { passwordEnc: '' },
    }),
    prisma.myFitnessPalAccount.updateMany({
      where: { athleteId },
      data: { sessionTokenEnc: '' },
    }),
  ]);
}

/** Immediate soft-delete. Profile is blocked from app use; hard purge after 30 days. */
export async function softDeleteAthlete(
  athleteId: string,
  now = new Date(),
): Promise<SoftDeleteResult> {
  const updated = await prisma.athleteProfile.update({
    where: { id: athleteId },
    data: { deletedAt: now },
    select: { id: true, deletedAt: true },
  });
  await clearAthleteProviderCredentials(athleteId);
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
