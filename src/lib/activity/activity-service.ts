import { ActivityType } from '@prisma/client';
import { isSet } from '@/lib/util/value';
import { resolveExerciseCatalogId } from '@/lib/exercises';
import type { CreateActivityInput, UpdateActivityInput } from '@/lib/validators/activity';

function cleanMetrics<T extends Record<string, unknown>>(metrics?: T | null) {
  if (!metrics) {
    return undefined;
  }
  const entries = Object.entries(metrics).filter(
    ([, value]) => isSet(value) && value !== undefined && value !== '',
  );
  return entries.length ? (Object.fromEntries(entries) as T) : undefined;
}

type MetricRelation = { create?: unknown; upsert?: unknown };

const CREATE_METRIC_HANDLERS: Partial<
  Record<ActivityType, (metrics: unknown) => MetricRelation | undefined>
> = {
  [ActivityType.RUN]: (metrics) =>
    metrics ? { create: cleanMetrics(metrics as Record<string, unknown>) } : undefined,
  [ActivityType.BIKE]: (metrics) =>
    metrics ? { create: cleanMetrics(metrics as Record<string, unknown>) } : undefined,
  [ActivityType.SWIM]: (metrics) =>
    metrics ? { create: cleanMetrics(metrics as Record<string, unknown>) } : undefined,
  [ActivityType.HIKE]: (metrics) =>
    metrics ? { create: cleanMetrics(metrics as Record<string, unknown>) } : undefined,
};

function createMetricRelation(type: ActivityType, metrics: unknown): MetricRelation | undefined {
  return CREATE_METRIC_HANDLERS[type]?.(metrics);
}

function upsertMetricRelation(metrics: unknown): MetricRelation | undefined {
  const cleaned = cleanMetrics(metrics as Record<string, unknown>);
  // Empty `{}` after cleaning means the client sent no real metric fields —
  // do not invent an empty nested upsert (prod symptom: create:{}, update:{}).
  if (!cleaned) {
    return undefined;
  }
  return { upsert: { create: cleaned, update: cleaned } };
}

export function buildActivityCreateData(input: CreateActivityInput) {
  const { runMetrics, bikeMetrics, swimMetrics, hikeMetrics, strengthSets, ...base } = input;

  return {
    ...base,
    runMetrics:
      input.type === ActivityType.RUN ? createMetricRelation(input.type, runMetrics) : undefined,
    bikeMetrics:
      input.type === ActivityType.BIKE ? createMetricRelation(input.type, bikeMetrics) : undefined,
    swimMetrics:
      input.type === ActivityType.SWIM ? createMetricRelation(input.type, swimMetrics) : undefined,
    hikeMetrics:
      input.type === ActivityType.HIKE ? createMetricRelation(input.type, hikeMetrics) : undefined,
    strengthSets:
      input.type === ActivityType.STRENGTH && strengthSets?.length
        ? {
            create: strengthSets.map((set, index) => ({
              ...set,
              exerciseCatalogId: resolveExerciseCatalogId(set.exercise),
              order: set.order ?? index,
            })),
          }
        : undefined,
  };
}

export function buildActivityUpdateData(input: UpdateActivityInput) {
  const { runMetrics, bikeMetrics, swimMetrics, hikeMetrics, strengthSets, type, ...base } = input;

  const data: Record<string, unknown> = { ...base };
  if (type) {
    data.type = type;
  }

  if (runMetrics !== undefined) {
    const relation = upsertMetricRelation(runMetrics);
    if (relation) {
      data.runMetrics = relation;
    }
  }
  if (bikeMetrics !== undefined) {
    const relation = upsertMetricRelation(bikeMetrics);
    if (relation) {
      data.bikeMetrics = relation;
    }
  }
  if (swimMetrics !== undefined) {
    const relation = upsertMetricRelation(swimMetrics);
    if (relation) {
      data.swimMetrics = relation;
    }
  }
  if (hikeMetrics !== undefined) {
    const relation = upsertMetricRelation(hikeMetrics);
    if (relation) {
      data.hikeMetrics = relation;
    }
  }

  if (type === ActivityType.STRENGTH && strengthSets) {
    data.strengthSets = {
      deleteMany: {},
      create: strengthSets.map((set, index) => ({
        ...set,
        exerciseCatalogId: resolveExerciseCatalogId(set.exercise),
        order: set.order ?? index,
      })),
    };
  }

  return data;
}
