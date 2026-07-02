/**
 * EXTRACTION CONTEXT PROVIDER — Prisma implementation
 *
 * Resolves athlete capabilities (FTP, maxHr, etc.) from the AthleteProfile
 * and recent physiological observations into an ExtractionContext.
 *
 * This adapter prevents the FeatureEngine from importing Prisma directly.
 * The FeatureEngine depends only on the ExtractionContextProvider interface.
 */

import type { PrismaClient } from '@prisma/client';

import type { ExtractionContextProvider } from '@/core/features/engine';
import type { ExtractionContext } from '@/core/features/context';

export class AthleteContextProvider implements ExtractionContextProvider {
  constructor(private readonly prisma: PrismaClient) {}

  async getContext(athleteId: string, trainingDayId: string): Promise<ExtractionContext> {
    // AthleteProfile uses id = 'default' (single-athlete app)
    const profile = await this.prisma.athleteProfile.findUnique({
      where: { id: 'default' },
    });

    // Use most recent resting HR observation as restingHr proxy
    const recentRhrObs = await this.prisma.observation.findFirst({
      where: {
        athleteId,
        type: 'RESTING_HR',
      },
      orderBy: { timestamp: 'desc' },
      select: { data: true },
    });

    const restingHr = recentRhrObs?.data
      ? (recentRhrObs.data as { valueBpm?: number }).valueBpm
      : undefined;

    // Determine timezone from the athlete's Google account (if set)
    const googleAccount = await this.prisma.googleAccount.findFirst({
      select: { timeZone: true },
    });

    return {
      athleteId,
      trainingDayId,
      timezone: googleAccount?.timeZone ?? 'Europe/Paris',
      ftpW: profile?.ftpW ?? undefined,
      maxHr: profile?.maxHr ?? undefined,
      restingHr: restingHr ?? undefined,
      lthr: profile?.lthr ?? undefined,
      runThresholdPaceSecPerKm: profile?.runThresholdPaceSecPerKm ?? undefined,
      sleepTargetMinutes: profile?.sleepTargetMinutes ?? undefined,
    };
  }
}
