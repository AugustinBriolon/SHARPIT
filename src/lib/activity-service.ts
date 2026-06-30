import { ActivityType } from '@prisma/client';
import type { CreateActivityInput, UpdateActivityInput } from '@/lib/validators/activity';

function cleanMetrics<T extends Record<string, unknown>>(metrics?: T | null) {
  if (!metrics) return undefined;
  const entries = Object.entries(metrics).filter(
    ([, value]) => value !== null && value !== undefined && value !== '',
  );
  return entries.length ? (Object.fromEntries(entries) as T) : undefined;
}

export function buildActivityCreateData(input: CreateActivityInput) {
  const { runMetrics, bikeMetrics, swimMetrics, strengthSets, ...base } = input;

  return {
    ...base,
    runMetrics:
      input.type === ActivityType.RUN && runMetrics
        ? { create: cleanMetrics(runMetrics) }
        : undefined,
    bikeMetrics:
      input.type === ActivityType.BIKE && bikeMetrics
        ? { create: cleanMetrics(bikeMetrics) }
        : undefined,
    swimMetrics:
      input.type === ActivityType.SWIM && swimMetrics
        ? { create: cleanMetrics(swimMetrics) }
        : undefined,
    strengthSets:
      input.type === ActivityType.STRENGTH && strengthSets?.length
        ? {
            create: strengthSets.map((set, index) => ({
              ...set,
              order: set.order ?? index,
            })),
          }
        : undefined,
  };
}

export function buildActivityUpdateData(input: UpdateActivityInput) {
  const { runMetrics, bikeMetrics, swimMetrics, strengthSets, type, ...base } = input;

  const data: Record<string, unknown> = { ...base };
  if (type) data.type = type;

  const activityType = type;

  if (activityType === ActivityType.RUN && runMetrics) {
    data.runMetrics = {
      upsert: {
        create: cleanMetrics(runMetrics) ?? {},
        update: cleanMetrics(runMetrics) ?? {},
      },
    };
  }

  if (activityType === ActivityType.BIKE && bikeMetrics) {
    data.bikeMetrics = {
      upsert: {
        create: cleanMetrics(bikeMetrics) ?? {},
        update: cleanMetrics(bikeMetrics) ?? {},
      },
    };
  }

  if (activityType === ActivityType.SWIM && swimMetrics) {
    data.swimMetrics = {
      upsert: {
        create: cleanMetrics(swimMetrics) ?? {},
        update: cleanMetrics(swimMetrics) ?? {},
      },
    };
  }

  if (activityType === ActivityType.STRENGTH && strengthSets) {
    data.strengthSets = {
      deleteMany: {},
      create: strengthSets.map((set, index) => ({
        ...set,
        order: set.order ?? index,
      })),
    };
  }

  return data;
}
