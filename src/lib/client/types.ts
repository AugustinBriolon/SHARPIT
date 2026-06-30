import type {
  getActiveTrainingPlan,
  getActivitiesList,
  getGoals,
  getHealthEntries,
  getPhysicalNotes,
  getPlannedSessions,
  getThresholdSnapshots,
} from '@/lib/queries';

/**
 * Types côté client. Les fonctions de query renvoient des objets Prisma avec des
 * dates `Date` ; après passage par JSON les dates sont revivifiées (voir
 * fetchers.ts) donc on réutilise directement les types serveur (import de type
 * uniquement, aucun runtime Prisma n'est embarqué dans le bundle client).
 */
export type ClientActivity = Awaited<ReturnType<typeof getActivitiesList>>[number];
export type ClientHealthEntry = Awaited<ReturnType<typeof getHealthEntries>>[number];
export type ClientGoal = Awaited<ReturnType<typeof getGoals>>[number];
export type ClientPlannedSession = Awaited<ReturnType<typeof getPlannedSessions>>[number];
export type ClientPhysicalNote = Awaited<ReturnType<typeof getPhysicalNotes>>[number];
export type ClientPhysicalCheckin = ClientPhysicalNote['checkins'][number];
export type ClientTrainingPlan = NonNullable<Awaited<ReturnType<typeof getActiveTrainingPlan>>>;
export type ClientPlanWeek = ClientTrainingPlan['weeks'][number];
export type ClientThresholdSnapshot = Awaited<ReturnType<typeof getThresholdSnapshots>>[number];
