import { ActivityType, type PrismaClient } from '@prisma/client';
import type { ExtractionContext } from '@/core/features/context';
import type { SessionStreamProvider } from '@/core/features/engine';
import type { SessionObservation } from '@/core/observation/types';
import {
  analyzeActivityStreams,
  resolveThresholds,
  type AthleteThresholds,
} from '@/lib/activity-analysis';
import type { RawStreams } from '@/lib/streams';

function toActivityType(sportType: SessionObservation['sportType']): ActivityType {
  switch (sportType) {
    case 'RUN':
    case 'TRAIL_RUN':
      return ActivityType.RUN;
    case 'BIKE':
    case 'MTB':
      return ActivityType.BIKE;
    case 'SWIM':
    case 'OPEN_WATER':
      return ActivityType.SWIM;
    case 'STRENGTH':
    case 'YOGA':
      return ActivityType.STRENGTH;
    case 'TRIATHLON':
      return ActivityType.TRIATHLON;
    default:
      return ActivityType.OTHER;
  }
}

function buildThresholds(
  ctx: ExtractionContext,
  raw: RawStreams,
  session: SessionObservation,
): AthleteThresholds {
  return resolveThresholds(
    {
      ftpW: ctx.ftpW ?? null,
      maxHr: ctx.maxHr ?? null,
      lthr: ctx.lthr ?? null,
      runThresholdPaceSecPerKm: ctx.runThresholdPaceSecPerKm ?? null,
    },
    raw,
    {
      type: toActivityType(session.sportType),
      durationSec: session.durationSec,
      bikeNormalizedPower: session.powerData?.normalizedPower ?? null,
      bikeIntensityFactor: session.powerData?.intensityFactor ?? null,
    },
  );
}

function findSessionWhere(session: SessionObservation) {
  if (session.source === 'GARMIN' && session.externalId) {
    return { garminId: session.externalId };
  }
  if (session.source === 'STRAVA' && session.externalId) {
    return { stravaId: session.externalId };
  }
  if (session.source === 'MANUAL' && session.externalId?.startsWith('manual:activity:')) {
    return { id: session.externalId.replace('manual:activity:', '') };
  }
  return null;
}

function mapZonesToFiveBuckets(
  zones: Array<{ id: string; seconds: number }>,
): readonly [number, number, number, number, number] | null {
  if (zones.length === 0) return null;

  const buckets = [0, 0, 0, 0, 0];
  for (const zone of zones) {
    switch (zone.id) {
      case 'z1':
        buckets[0] += zone.seconds / 60;
        break;
      case 'z2':
        buckets[1] += zone.seconds / 60;
        break;
      case 'z3':
        buckets[2] += zone.seconds / 60;
        break;
      case 'z4':
        buckets[3] += zone.seconds / 60;
        break;
      default:
        buckets[4] += zone.seconds / 60;
        break;
    }
  }

  return buckets.map((v) => Number(v.toFixed(1))) as [number, number, number, number, number];
}

export class PrismaSessionStreamProvider implements SessionStreamProvider {
  constructor(private readonly prisma: PrismaClient) {}

  async getSessionStream(session: SessionObservation, ctx: ExtractionContext) {
    const where = findSessionWhere(session);
    if (!where) return null;

    const activity = await this.prisma.activity.findFirst({
      where,
      select: {
        id: true,
        type: true,
        duration: true,
        stream: { select: { available: true, data: true } },
      },
    });

    if (!activity?.stream?.available || !activity.stream.data) return null;

    const raw = activity.stream.data as unknown as RawStreams;
    const thresholds = buildThresholds(ctx, raw, session);
    const analysis = analyzeActivityStreams(raw, thresholds, {
      type: activity.type,
      durationSec: activity.duration,
      bikeNormalizedPower: session.powerData?.normalizedPower ?? null,
      bikeIntensityFactor: session.powerData?.intensityFactor ?? null,
    });

    if (!analysis) return null;

    const zones = analysis.hr.zones.length > 0 ? analysis.hr.zones : (analysis.power?.zones ?? []);
    const timeInZones = mapZonesToFiveBuckets(zones);
    const aerobicLoadFactor =
      timeInZones == null
        ? null
        : Number(
            (
              (timeInZones[0] + timeInZones[1]) / Math.max(session.durationSec / 60, 1) || 0
            ).toFixed(3),
          );
    const anaerobicLoadFactor =
      timeInZones == null
        ? null
        : Number(
            (
              (timeInZones[3] + timeInZones[4]) / Math.max(session.durationSec / 60, 1) || 0
            ).toFixed(3),
          );

    return {
      aerobicLoadFactor,
      anaerobicLoadFactor,
      timeInZones,
      hrDriftPercent: analysis.hr.decouplingPct,
      paceVariabilityIndex:
        analysis.run?.paceVariabilityPct != null
          ? Number((analysis.run.paceVariabilityPct / 100).toFixed(3))
          : null,
    };
  }
}
