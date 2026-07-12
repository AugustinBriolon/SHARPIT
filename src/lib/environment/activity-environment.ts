/**
 * Resolve ActivityEnvironment for presentation (Phase 3).
 */

import {
  buildActivityEnvironment,
  type ActivityEnvironmentalCorrection,
  type EnvironmentalApplicability,
} from '@/core/environment';
import type { ActivityType } from '@prisma/client';
import { PrismaEnvironmentalObservationRepository } from '@/infrastructure/environment/prisma-environment-observation-repository';
import { resolveAthleteGeoLocation } from '@/lib/environment/athlete-location';
import { activityWeatherWindow } from '@/lib/activity/activity-weather-window';
import { prisma } from '@/lib/prisma';
import { computeTrainingDayId } from '@/lib/training-day';

export type ActivityEnvironmentPresentation = {
  readonly applicability: EnvironmentalApplicability;
  readonly correction: ActivityEnvironmentalCorrection;
  readonly visible: boolean;
};

const INDOOR_HINTS = /home\s*trainer|indoor|intérieur|tapis|rulle?r|zwift/i;
const observationRepo = new PrismaEnvironmentalObservationRepository(prisma);

function emptyActivityEnvironmentPresentation(
  activityId: string,
  applicability: EnvironmentalApplicability,
): ActivityEnvironmentPresentation {
  return {
    applicability,
    correction: {
      activityId,
      rawMetricsPreserved: true,
      factors: [],
      totalAttributedEffect: {
        available: false,
        quality: 'MISSING',
        confidence: 0,
        reason: 'INSUFFICIENT_OBSERVATIONS',
        explanation: 'Données environnementales indisponibles.',
      },
      narrative: [],
    },
    visible: false,
  };
}

function isEnvironmentalObservationRepoReady(client: typeof prisma): boolean {
  return 'environmentalObservationRecord' in client;
}

function resolveApplicability(activity: {
  type: ActivityType;
  weather: string | null;
}): EnvironmentalApplicability {
  if (activity.type === 'STRENGTH') return 'INDOOR';
  if (activity.weather && INDOOR_HINTS.test(activity.weather)) return 'INDOOR';
  return 'OUTDOOR';
}

function activityWindow(activity: { date: Date; duration: number | null }): {
  start: Date;
  end: Date;
} {
  return activityWeatherWindow(activity.date, activity.duration);
}

export async function resolveActivityEnvironmentPresentation(input: {
  athleteId: string;
  activity: {
    id: string;
    type: ActivityType;
    date: Date;
    duration: number | null;
    weather: string | null;
    observedLocationLat?: number | null;
    observedLocationLng?: number | null;
    observedLocationLabel?: string | null;
  };
}): Promise<ActivityEnvironmentPresentation> {
  const applicability = resolveApplicability(input.activity);

  if (!isEnvironmentalObservationRepoReady(prisma)) {
    return emptyActivityEnvironmentPresentation(input.activity.id, applicability);
  }

  try {
    const trainingDayId = computeTrainingDayId(input.activity.date);
    const window = activityWindow(input.activity);

    const [records, athleteLocation] = await Promise.all([
      observationRepo.findActiveForTrainingDay(input.athleteId, trainingDayId),
      resolveAthleteGeoLocation(prisma, input.athleteId, trainingDayId),
    ]);

    const location =
      input.activity.observedLocationLat != null && input.activity.observedLocationLng != null
        ? {
            latitude: input.activity.observedLocationLat,
            longitude: input.activity.observedLocationLng,
            label: input.activity.observedLocationLabel ?? undefined,
          }
        : athleteLocation;

    const env = buildActivityEnvironment({
      activityId: input.activity.id,
      athleteId: input.athleteId,
      window,
      location,
      records,
      applicability: {
        sportType: input.activity.type,
        indoorFlag: applicability === 'INDOOR',
        locationType: applicability === 'INDOOR' ? 'TRAINER' : 'ROAD',
      },
      computedAt: new Date(),
    });

    return {
      applicability: env.applicability,
      correction: env.correction,
      visible: env.correction.factors.length > 0 || env.correction.narrative.length > 0,
    };
  } catch (error) {
    console.warn('[activity-environment] presentation unavailable:', error);
    return emptyActivityEnvironmentPresentation(input.activity.id, applicability);
  }
}
