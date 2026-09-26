import { Prisma } from '@prisma/client';
import type { HikeTripSummary } from '@sharpit/app/lib/activity/hike/hike-trip-summary';

export const hikeTripActivitySelect = {
  id: true,
  type: true,
  date: true,
  title: true,
  duration: true,
  load: true,
  observedLocationLabel: true,
  hikeMetrics: {
    select: { distanceM: true, elevationM: true, elevationLossM: true },
  },
} satisfies Prisma.ActivitySelect;

type HikeTripActivity = Prisma.ActivityGetPayload<{ select: typeof hikeTripActivitySelect }>;

export type HikeTripWithActivities = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  activities: HikeTripActivity[];
};

export type HikeTripListItem = HikeTripWithActivities & {
  summary: HikeTripSummary;
};
