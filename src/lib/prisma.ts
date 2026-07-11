import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function useNeonAdapter(connectionString: string | undefined): boolean {
  if (!connectionString) return false;
  if (process.env.PRISMA_NEON_ADAPTER === 'false') return false;
  if (process.env.PRISMA_NEON_ADAPTER === 'true') return true;
  return connectionString.includes('neon.tech');
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  const log =
    process.env.NODE_ENV === 'development' ? (['error', 'warn'] as const) : (['error'] as const);

  if (useNeonAdapter(connectionString)) {
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({ adapter, log: [...log] });
  }

  return new PrismaClient({ log: [...log] });
}

/** Bust dev HMR cache when schema delegates are missing (e.g. after prisma generate). */
function isPrismaClientCurrent(client: PrismaClient): boolean {
  return 'condition' in client && 'environmentalObservationRecord' in client;
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
