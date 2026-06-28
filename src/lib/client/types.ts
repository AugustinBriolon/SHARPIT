import type {
  getActivities,
  getGoals,
  getHealthEntries,
  getPlannedSessions,
} from "@/lib/queries";

/**
 * Types côté client. Les fonctions de query renvoient des objets Prisma avec des
 * dates `Date` ; après passage par JSON les dates sont revivifiées (voir
 * fetchers.ts) donc on réutilise directement les types serveur (import de type
 * uniquement, aucun runtime Prisma n'est embarqué dans le bundle client).
 */
export type ClientActivity = Awaited<ReturnType<typeof getActivities>>[number];
export type ClientHealthEntry = Awaited<
  ReturnType<typeof getHealthEntries>
>[number];
export type ClientGoal = Awaited<ReturnType<typeof getGoals>>[number];
export type ClientPlannedSession = Awaited<
  ReturnType<typeof getPlannedSessions>
>[number];
