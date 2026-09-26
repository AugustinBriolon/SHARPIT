import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import { shouldUseNeonAdapter } from './neon-adapter';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  const log =
    process.env.NODE_ENV === 'development' ? (['error', 'warn'] as const) : (['error'] as const);

  if (shouldUseNeonAdapter(connectionString, process.env.PRISMA_NEON_ADAPTER)) {
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({ adapter, log: [...log] });
  }

  return new PrismaClient({ log: [...log] });
}

/** Bust dev HMR cache when schema delegates are missing (e.g. after prisma generate). */
function isPrismaClientCurrent(client: PrismaClient): boolean {
  return (
    'condition' in client &&
    'environmentalObservationRecord' in client &&
    'athleteDayJournal' in client &&
    'athleteActivityStatus' in client &&
    'journalHabitExperiment' in client
  );
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && isPrismaClientCurrent(cached)) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => {});
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();
