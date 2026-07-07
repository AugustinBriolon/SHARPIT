import { NextRequest, NextResponse } from 'next/server';
import { featureEngine } from '@/lib/engines/feature-engine';
import { prisma } from '@/lib/prisma';
import { computeDailyStrain } from '@/lib/daily-strain';

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
    const [features, activities, athleteProfile] = await Promise.all([
      featureEngine.getDayFeatures(athleteId, trainingDayId),
      prisma.activity.findMany({
        where: {
          date: {
            gte: new Date(`${trainingDayId}T00:00:00.000Z`),
            lte: new Date(`${trainingDayId}T23:59:59.999Z`),
          },
        },
        include: {
          runMetrics: true,
          bikeMetrics: true,
          swimMetrics: true,
        },
        orderBy: { date: 'asc' },
      }),
      prisma.athleteProfile.findUnique({ where: { id: athleteId } }),
    ]);

    const result = computeDailyStrain({
      sessionFeatures: features.sessions,
      legacyActivities: activities,
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
