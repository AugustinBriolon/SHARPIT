/**
 * Resolve PlannedSessionContext — forecast + advisories (server-side).
 */

import type { ActivityType, PlannedSession, SessionIntensity } from '@prisma/client';
import {
  buildForecastEnvironment,
  isEnvironmentApplicable,
  resolveEnvironmentalApplicability,
  type GeoLocation,
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
} from '@/core/planned-session/types';
import { defaultExposureForActivityType } from '@/core/planned-session/defaults';
import { resolveAthleteGeoLocation } from '@/lib/environment/athlete-location';
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

function resolveLocation(session: PlannedSessionRecord, fallback: GeoLocation): GeoLocation | null {
  if (session.locationLat != null && session.locationLng != null) {
    return {
      latitude: session.locationLat,
      longitude: session.locationLng,
      label: session.locationLabel ?? undefined,
    };
  }
  return fallback;
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

function buildIntention(session: PlannedSessionRecord): PlannedSessionIntention {
  const window = parseScheduledWindow(session.date, session.startTime, session.durationMin);
  const exposure = exposureFromRecord(session);
  const fallback = { latitude: 48.8566, longitude: 2.3522, label: 'default' };

  return {
    sessionId: session.id,
    type: session.type,
    scheduledStart: window.start.toISOString(),
    scheduledEnd: window.end.toISOString(),
    durationMin: session.durationMin,
    intensity: session.intensity,
    exposure,
    location: resolveLocation(session, fallback),
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
}): Promise<PlannedSessionEnvironmentalProjection | null> {
  const { session, intention } = input;
  const { exposure } = intention;

  const applicability = resolveEnvironmentalApplicability({
    sportType: session.type as ActivityType,
    indoorFlag: exposure === 'INDOOR' ? true : exposure === 'OUTDOOR' ? false : null,
    locationType: intention.locationType,
    athleteDeclaredExposure: exposure === 'UNKNOWN' ? null : exposure,
  });

  if (!isEnvironmentApplicable(applicability)) {
    return {
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
    };
  }

  if (exposure === 'UNKNOWN') {
    return null;
  }

  const trainingDayId = computeTrainingDayId(new Date(intention.scheduledStart));
  const fallbackLocation = await resolveAthleteGeoLocation(prisma, ATHLETE_ID, trainingDayId);
  const location = intention.location ?? fallbackLocation;
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

  return {
    applicability,
    thermalStressLevel: snapshot.thermalStressLevel,
    trainingImpact: snapshot.trainingImpact,
    recoveryDemandAdjustment: snapshot.recoveryDemandAdjustment,
    performanceAdjustment: snapshot.performanceAdjustment,
    confidence: snapshot.confidence,
    dataCompleteness:
      predictions.length >= 3 ? 'COMPLETE' : predictions.length >= 1 ? 'PARTIAL' : 'MINIMAL',
    freshness: projectionFreshness(computedAt),
    providerId,
    computedAt: computedAt.toISOString(),
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

  const intention = buildIntention(session);
  const environment = await buildEnvironmentalProjection({ session, intention });

  const advisories = buildPlannedSessionAdvisories({
    sessionType: session.type,
    exposure: intention.exposure,
    intensity: session.intensity as SessionIntensity | null,
    environment,
    scheduledHourLocal: parseScheduledWindow(session.date, session.startTime, session.durationMin)
      .hourLocal,
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
