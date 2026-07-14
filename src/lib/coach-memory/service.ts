import type { PrismaClient } from '@prisma/client';
import { memoryEntriesFromTravelContexts } from '@/lib/coach-memory/present';
import type { CoachMemoryEntry, TravelMemoryInput } from '@/lib/coach-memory/types';
import { getAthleteProfile } from '@/lib/queries';
import {
  createTravelContext,
  deleteTravelContext,
  getActiveTravelContext,
  listTravelContexts,
  updateTravelContext,
} from '@/lib/travel-context/service';

export type CoachMemorySnapshot = {
  entries: CoachMemoryEntry[];
  activeId: string | null;
  profileContext: string;
};

export async function listCoachMemoryEntries(
  prisma: PrismaClient,
  onDate = new Date(),
): Promise<CoachMemorySnapshot> {
  const [active, travels, profile] = await Promise.all([
    getActiveTravelContext(prisma, onDate),
    listTravelContexts(prisma),
    getAthleteProfile().catch(() => null),
  ]);

  return {
    entries: memoryEntriesFromTravelContexts(travels, onDate),
    activeId: active?.id ?? null,
    profileContext: profile?.context ?? '',
  };
}

export async function createTravelMemoryEntry(prisma: PrismaClient, input: TravelMemoryInput) {
  const travel = await createTravelContext(prisma, input);
  return travelContextToEntry(travel);
}

export async function updateTravelMemoryEntry(
  prisma: PrismaClient,
  id: string,
  input: Omit<TravelMemoryInput, 'source' | 'applyToPlannedSessions'>,
) {
  const travel = await updateTravelContext(prisma, id, input);
  return travelContextToEntry(travel);
}

export async function deleteCoachMemoryEntry(prisma: PrismaClient, id: string) {
  await deleteTravelContext(prisma, id);
}

function travelContextToEntry(
  travel: Awaited<ReturnType<typeof listTravelContexts>>[number],
): CoachMemoryEntry {
  return memoryEntriesFromTravelContexts([travel])[0]!;
}
