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

function optionalProfileField<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

function buildExtractionContextFields(input: {
  athleteId: string;
  trainingDayId: string;
  timezone: string;
  profile: Awaited<ReturnType<AthleteContextProvider['fetchProfile']>>;
  restingHr: number | undefined;
}): ExtractionContext {
  const { athleteId, trainingDayId, timezone, profile, restingHr } = input;
  return {
    athleteId,
    trainingDayId,
    timezone,
    ftpW: optionalProfileField(profile?.ftpW),
    maxHr: optionalProfileField(profile?.maxHr),
    restingHr,
    lthr: optionalProfileField(profile?.lthr),
    runThresholdPaceSecPerKm: optionalProfileField(profile?.runThresholdPaceSecPerKm),
    sleepTargetMinutes: optionalProfileField(profile?.sleepTargetMinutes),
  };
}

export class AthleteContextProvider implements ExtractionContextProvider {
  constructor(private readonly prisma: PrismaClient) {}

  async getContext(athleteId: string, trainingDayId: string): Promise<ExtractionContext> {
    const [profile, restingHr, timezone] = await Promise.all([
      this.fetchProfile(athleteId),
      this.fetchRestingHr(athleteId),
      this.fetchTimezone(athleteId),
    ]);

    return buildExtractionContextFields({
      athleteId,
      trainingDayId,
      timezone,
      profile,
      restingHr,
    });
  }

  private fetchProfile(athleteId: string) {
    return this.prisma.athleteProfile.findUnique({ where: { id: athleteId } });
  }

  private async fetchRestingHr(athleteId: string): Promise<number | undefined> {
    const recentRhrObs = await this.prisma.observation.findFirst({
      where: { athleteId, type: 'RESTING_HR' },
      orderBy: { timestamp: 'desc' },
      select: { data: true },
    });
    return recentRhrObs?.data ? (recentRhrObs.data as { valueBpm?: number }).valueBpm : undefined;
  }

  private async fetchTimezone(athleteId: string): Promise<string> {
    const googleAccount = await this.prisma.googleAccount.findFirst({
      where: { athleteId },
      select: { timeZone: true },
    });
    return googleAccount?.timeZone ?? 'Europe/Paris';
  }
}
