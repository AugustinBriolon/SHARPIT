/**
 * Resolve PlannedSessionContext — forecast + advisories (server-side).
 */

import type { ActivityType, PlannedSession, SessionIntensity } from '@prisma/client';
import {
  buildForecastEnvironment,
  isEnvironmentApplicable,
  resolveEnvironmentalApplicability,
  type GeoLocation,
  type EnvironmentalDataCompleteness,
} from '@/core/environment';
import {
  buildPlannedSessionAdvisories,
  buildPlannedSessionPreparation,
} from '@/core/decision/planned-session-advisory';
import { buildEnvironmentalDecisionSnapshotFromParts } from '@/core/inference/environment/snapshot';
import type {
  PlannedSessionContext,
  PlannedSessionEnvironmentalProjection,
  PlannedSessionExposureSetting,
  PlannedSessionIntention,
  PlannedSessionLocationType,
  PlannedSessionWeatherSignals,
} from '@/core/planned-session/types';
import { defaultExposureForActivityType } from '@/core/planned-session/defaults';

function indoorFlagFromExposure(exposure: PlannedSessionIntention['exposure']): boolean | null {
  if (exposure === 'INDOOR') return true;
  if (exposure === 'OUTDOOR') return false;
  return null;
}

function dataCompletenessFromPredictionCount(count: number): EnvironmentalDataCompleteness {
  if (count >= 3) return 'COMPLETE';
  if (count >= 1) return 'PARTIAL';
  return 'MINIMAL';
}
import { geocodePlaceLabel } from '@/lib/geocoding/nominatim';
import { resolveHomeLocation } from '@/lib/geocoding/home-location';
import { resolveAthleteGeoLocation } from '@/lib/environment/athlete-location';
import { getActiveTravelContext } from '@/lib/travel-context/service';
import { extractSessionWeatherSignals } from '@/lib/planned-session/weather-signals';
import { prisma } from '@/lib/prisma';
import { computeTrainingDayId } from '@/lib/training-day';
import { fetchForecastPredictions } from '@/lib/planned-session/forecast-fetch';

const ATHLETE_ID = 'default';
const CONTEXT_STALE_MS = 3 * 60 * 60 * 1000;

export type PlannedSessionRecord = Pick<
  PlannedSession,
  | 'id'
  | 'type'
  | 'date'
  | 'startTime'
  | 'durationMin'
  | 'intensity'
  | 'title'
  | 'exposureSetting'
  | 'locationLabel'
  | 'locationLat'
  | 'locationLng'
  | 'locationType'
  | 'environmentContext'
  | 'environmentContextAt'
>;

export function parseScheduledWindow(
  date: Date,
  startTime: string | null,
  durationMin: number | null,
): { start: Date; end: Date; hourLocal: number | null } {
  const start = new Date(date);
  if (startTime && /^\d{1,2}:\d{2}$/.test(startTime)) {
    const [h, m] = startTime.split(':').map(Number);
    start.setHours(h, m, 0, 0);
  } else {
    start.setHours(9, 0, 0, 0);
  }
  const durationMs = (durationMin ?? 60) * 60 * 1000;
  return {
    start,
    end: new Date(start.getTime() + durationMs),
    hourLocal: startTime ? start.getHours() : null,
  };
}

function resolveLocationFromRecord(
  session: PlannedSessionRecord,
  fallback: GeoLocation,
): GeoLocation | null {
  if (session.locationLat != null && session.locationLng != null) {
    return {
      latitude: session.locationLat,
      longitude: session.locationLng,
      label: session.locationLabel ?? undefined,
    };
  }
  return fallback;
}

async function resolveSessionGeoLocation(
  session: PlannedSessionRecord,
  sessionDate: Date,
): Promise<GeoLocation> {
  if (session.locationLat != null && session.locationLng != null) {
    return {
      latitude: session.locationLat,
      longitude: session.locationLng,
      label: session.locationLabel ?? undefined,
    };
  }

  if (session.locationLabel?.trim()) {
    const geocoded = await geocodePlaceLabel(session.locationLabel.trim());
    if (geocoded) {
      await prisma.plannedSession.update({
        where: { id: session.id },
        data: {
          locationLat: geocoded.latitude,
          locationLng: geocoded.longitude,
          locationLabel: geocoded.label,
        },
      });
      return {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        label: geocoded.label,
      };
    }
  }

  const travel = await getActiveTravelContext(prisma, sessionDate);
  if (travel) {
    return {
      latitude: travel.locationLat,
      longitude: travel.locationLng,
      label: travel.locationLabel,
    };
  }

  const home = await resolveHomeLocation(prisma);
  return home;
}

function exposureFromRecord(session: PlannedSessionRecord): PlannedSessionExposureSetting {
  const raw = session.exposureSetting;
  if (raw === 'INDOOR' || raw === 'OUTDOOR' || raw === 'UNKNOWN') return raw;
  return defaultExposureForActivityType(session.type);
}

function locationTypeFromRecord(session: PlannedSessionRecord): PlannedSessionLocationType | null {
  const raw = session.locationType;
  if (
    raw === 'TRACK' ||
    raw === 'ROAD' ||
    raw === 'TRAIL' ||
    raw === 'POOL' ||
    raw === 'GYM' ||
    raw === 'TRAINER' ||
    raw === 'UNKNOWN'
  ) {
    return raw;
  }
  return null;
}

function buildIntention(
  session: PlannedSessionRecord,
  location: GeoLocation | null,
): PlannedSessionIntention {
  const window = parseScheduledWindow(session.date, session.startTime, session.durationMin);
  const exposure = exposureFromRecord(session);

  return {
    sessionId: session.id,
    type: session.type,
    scheduledStart: window.start.toISOString(),
    scheduledEnd: window.end.toISOString(),
    durationMin: session.durationMin,
    intensity: session.intensity,
    exposure,
    location,
    locationType: locationTypeFromRecord(session),
    title: session.title,
  };
}

function projectionFreshness(computedAt: Date): 'FRESH' | 'STALE' | 'UNAVAILABLE' {
  const age = Date.now() - computedAt.getTime();
  if (age <= CONTEXT_STALE_MS) return 'FRESH';
  return 'STALE';
}

async function buildEnvironmentalProjection(input: {
  session: PlannedSessionRecord;
  intention: PlannedSessionIntention;
}): Promise<{
  environment: PlannedSessionEnvironmentalProjection | null;
  weatherSignals: PlannedSessionWeatherSignals | null;
}> {
  const { session, intention } = input;
  const { exposure } = intention;
  const emptySignals = {
    maxPrecipitationMm: null,
    minTemperatureC: null,
    maxWindMps: null,
  } satisfies PlannedSessionWeatherSignals;

  const applicability = resolveEnvironmentalApplicability({
    sportType: session.type as ActivityType,
    indoorFlag: indoorFlagFromExposure(exposure),
    locationType: intention.locationType,
    athleteDeclaredExposure: exposure === 'UNKNOWN' ? null : exposure,
  });

  if (!isEnvironmentApplicable(applicability)) {
    return {
      environment: {
        applicability,
        thermalStressLevel: 'NOT_APPLICABLE',
        trainingImpact: 'NONE',
        recoveryDemandAdjustment: null,
        performanceAdjustment: null,
        confidence: 1,
        dataCompleteness: 'NONE',
        freshness: 'FRESH',
        providerId: null,
        computedAt: new Date().toISOString(),
      },
      weatherSignals: emptySignals,
    };
  }

  if (exposure === 'UNKNOWN') {
    return { environment: null, weatherSignals: emptySignals };
  }

  const trainingDayId = computeTrainingDayId(new Date(intention.scheduledStart));
  const fallbackLocation = await resolveAthleteGeoLocation(prisma, ATHLETE_ID, trainingDayId);
  const location =
    intention.location ?? resolveLocationFromRecord(session, fallbackLocation) ?? fallbackLocation;
  const window = parseScheduledWindow(session.date, session.startTime, session.durationMin);

  const { predictions, providerId } = await fetchForecastPredictions({
    location,
    windowStart: window.start,
    windowEnd: window.end,
    athleteId: ATHLETE_ID,
    trainingDayId,
  });

  if (predictions.length === 0) {
    return {
      environment: {
        applicability,
        thermalStressLevel: 'UNKNOWN',
        trainingImpact: 'NONE',
        recoveryDemandAdjustment: null,
        performanceAdjustment: null,
        confidence: 0,
        dataCompleteness: 'NONE',
        freshness: 'UNAVAILABLE',
        providerId,
        computedAt: new Date().toISOString(),
      },
      weatherSignals: emptySignals,
    };
  }

  const forecast = buildForecastEnvironment({
    athleteId: ATHLETE_ID,
    targetWindow: { start: window.start, end: window.end },
    location,
    predictions,
    computedAt: new Date(),
  });

  const snapshot = buildEnvironmentalDecisionSnapshotFromParts({
    stress: forecast.projectedStress,
    impact: forecast.projectedImpact,
    confidence: forecast.confidence,
    computedAt: forecast.computedAt,
  });

  const { computedAt } = forecast;
  const weatherSignals = extractSessionWeatherSignals(predictions);

  return {
    environment: {
      applicability,
      thermalStressLevel: snapshot.thermalStressLevel,
      trainingImpact: snapshot.trainingImpact,
      recoveryDemandAdjustment: snapshot.recoveryDemandAdjustment,
      performanceAdjustment: snapshot.performanceAdjustment,
      confidence: snapshot.confidence,
      dataCompleteness: dataCompletenessFromPredictionCount(predictions.length),
      freshness: projectionFreshness(computedAt),
      providerId,
      computedAt: computedAt.toISOString(),
    },
    weatherSignals,
  };
}

export function isContextCacheValid(session: PlannedSessionRecord): boolean {
  if (!session.environmentContext || !session.environmentContextAt) return false;
  return projectionFreshness(session.environmentContextAt) === 'FRESH';
}

export function contextFromCache(session: PlannedSessionRecord): PlannedSessionContext | null {
  if (!session.environmentContext || typeof session.environmentContext !== 'object') return null;
  const cached = session.environmentContext as unknown as PlannedSessionContext;
  if (!cached.intention || cached.intention.sessionId !== session.id) return null;
  return cached;
}

export async function resolvePlannedSessionContext(
  session: PlannedSessionRecord,
  options?: { forceRefresh?: boolean },
): Promise<PlannedSessionContext> {
  if (!options?.forceRefresh && isContextCacheValid(session)) {
    const cached = contextFromCache(session);
    if (cached) return cached;
  }

  const intention = buildIntention(
    session,
    await resolveSessionGeoLocation(session, new Date(session.date)),
  );
  const { environment, weatherSignals } = await buildEnvironmentalProjection({
    session,
    intention,
  });

  const advisories = buildPlannedSessionAdvisories({
    sessionType: session.type,
    exposure: intention.exposure,
    intensity: session.intensity as SessionIntensity | null,
    environment,
    scheduledHourLocal: parseScheduledWindow(session.date, session.startTime, session.durationMin)
      .hourLocal,
    weatherSignals,
  });

  const preparation = buildPlannedSessionPreparation(advisories, environment);

  return {
    intention,
    environment,
    advisories,
    preparation,
  };
}

export async function refreshAndPersistPlannedSessionContext(
  sessionId: string,
): Promise<PlannedSessionContext | null> {
  const session = await prisma.plannedSession.findUnique({ where: { id: sessionId } });
  if (!session) return null;

  const context = await resolvePlannedSessionContext(session, { forceRefresh: true });

  await prisma.plannedSession.update({
    where: { id: sessionId },
    data: {
      environmentContext: context as object,
      environmentContextAt: new Date(),
    },
  });

  return context;
}
