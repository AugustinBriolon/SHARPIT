import { NextRequest, NextResponse } from 'next/server';
import { featureEngine } from '@/lib/engines/feature-engine';
import { prisma } from '@/lib/prisma';
import { computeDailyStrain } from '@/lib/training/daily-strain';
import {
  activityMatchesTrainingDay,
  approximateTrainingDayUtcRange,
  DEFAULT_TRAINING_DAY_START_HOUR,
  DEFAULT_TRAINING_DAY_TIMEZONE,
} from '@/lib/training/training-day';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainingDayId = searchParams.get('trainingDayId');
  const athleteId = searchParams.get('athleteId') ?? 'default';

  if (!trainingDayId || !/^\d{4}-\d{2}-\d{2}$/.test(trainingDayId)) {
    return NextResponse.json(
      { error: 'trainingDayId is required and must be in YYYY-MM-DD format.' },
      { status: 400 },
    );
  }

  try {
    const [features, activities, athleteProfile, googleAccount, healthEntry] = await Promise.all([
      featureEngine.getDayFeatures(athleteId, trainingDayId),
      prisma.activity.findMany({
        where: {
          date: approximateTrainingDayUtcRange(trainingDayId),
        },
        include: {
          runMetrics: true,
          bikeMetrics: true,
          swimMetrics: true,
        },
        orderBy: { date: 'asc' },
      }),
      prisma.athleteProfile.findUnique({ where: { id: athleteId } }),
      prisma.googleAccount.findFirst({ select: { timeZone: true } }),
      prisma.dailyHealth.findUnique({
        where: { date: new Date(`${trainingDayId}T00:00:00.000Z`) },
      }),
    ]);
    const trainingDayOptions = {
      timezone: googleAccount?.timeZone ?? DEFAULT_TRAINING_DAY_TIMEZONE,
      trainingDayStartHour: DEFAULT_TRAINING_DAY_START_HOUR,
    };
    const filteredActivities = activities.filter((activity) =>
      activityMatchesTrainingDay(activity.date, trainingDayId, trainingDayOptions),
    );

    const result = computeDailyStrain({
      sessionFeatures: features.sessions,
      legacyActivities: filteredActivities,
      healthSignals: healthEntry
        ? {
            calories: healthEntry.calories,
            recoveryScore: healthEntry.recoveryScore,
            stress: healthEntry.stress,
            bodyBattery: healthEntry.bodyBattery,
            restingHr: healthEntry.restingHr,
            hrv: healthEntry.hrv,
          }
        : null,
      thresholds: {
        ftpW: athleteProfile?.ftpW ?? null,
        maxHr: athleteProfile?.maxHr ?? null,
        lthr: athleteProfile?.lthr ?? null,
        restingHr: features.recovery !== 'PENDING' ? (features.recovery.rhrAbsolute ?? null) : null,
      },
    });

    return NextResponse.json({
      athleteId,
      trainingDayId,
      ...result,
    });
  } catch (error) {
    console.error('[api/daily-strain]', error);
    return NextResponse.json(
      { error: 'Daily strain computation failed. Please try again.' },
      { status: 500 },
    );
  }
}
