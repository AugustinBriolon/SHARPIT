import type {
  getActiveTrainingPlan,
  getActivitiesList,
  getActivityById,
  getHealthEntries,
  getBodyCompositionMeasurements,
  getHikeTripById,
  getPhysicalNotes,
  getPlannedSessions,
  getThresholdSnapshots,
  listHikeTrips,
} from '@/lib/queries';
import type { enrichGoalsWithProgress } from '@/lib/goals/goal-achievements';
import type { Goal } from '@prisma/client';

/**
 * Types côté client. Les fonctions de query renvoient des objets Prisma avec des
 * dates `Date` ; après passage par JSON les dates sont revivifiées (voir
 * fetchers.ts) donc on réutilise directement les types serveur (import de type
 * uniquement, aucun runtime Prisma n'est embarqué dans le bundle client).
 */
export type ClientActivity = Awaited<ReturnType<typeof getActivitiesList>>[number];
export type ClientActivityDetail = NonNullable<Awaited<ReturnType<typeof getActivityById>>>;
export type ClientHealthEntry = Awaited<ReturnType<typeof getHealthEntries>>[number];
export type ClientBodyCompositionEntry = Awaited<
  ReturnType<typeof getBodyCompositionMeasurements>
>[number];
export type ClientGoal = Awaited<ReturnType<typeof enrichGoalsWithProgress<Goal>>>[number];
export type ClientPlannedSession = Awaited<ReturnType<typeof getPlannedSessions>>[number];
export type ClientPhysicalNote = Awaited<ReturnType<typeof getPhysicalNotes>>[number];
export type ClientPhysicalCheckin = ClientPhysicalNote['checkins'][number];
export type ClientTrainingPlan = NonNullable<Awaited<ReturnType<typeof getActiveTrainingPlan>>>;
export type ClientPlanWeek = ClientTrainingPlan['weeks'][number];
export type ClientThresholdSnapshot = Awaited<ReturnType<typeof getThresholdSnapshots>>[number];
export type ClientHikeTrip = NonNullable<Awaited<ReturnType<typeof getHikeTripById>>>;
export type ClientHikeTripListItem = Awaited<ReturnType<typeof listHikeTrips>>[number];
