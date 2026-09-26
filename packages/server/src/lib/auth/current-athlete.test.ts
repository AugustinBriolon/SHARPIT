import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const authMock = vi.fn();
const findUniqueMock = vi.fn();
const createMock = vi.fn();
const findUniqueOrThrowMock = vi.fn();
const deleteManyMock = vi.fn();
const getUserMock = vi.fn();
const cookiesGetMock = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
  clerkClient: async () => ({ users: { getUser: getUserMock } }),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: cookiesGetMock }),
}));

vi.mock('@sharpit/server/lib/demo/seed-demo-data', () => ({
  ensureDemoSeedFresh: vi.fn().mockResolvedValue(false),
}));

vi.mock('@sharpit/db/client', () => ({
  prisma: {
    athleteProfile: {
      findUnique: findUniqueMock,
      create: createMock,
      findUniqueOrThrow: findUniqueOrThrowMock,
      deleteMany: deleteManyMock,
    },
  },
}));

function uniqueConstraintError(): PrismaClientKnownRequestError {
  return new PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

/**
 * `getCurrentAthleteId` is wrapped in React's `cache()`, which memoizes across
 * calls within one module instance — outside a Next.js request there is no
 * boundary to reset it, so each test re-imports the module fresh.
 */
async function importFresh() {
  vi.resetModules();
  return import('./current-athlete');
}

describe('getCurrentAthleteId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesGetMock.mockReturnValue(undefined);
    getUserMock.mockResolvedValue({ id: 'user' });
    deleteManyMock.mockResolvedValue({ count: 1 });
  });

  it('resolves the fixed demo athlete for an anonymous visitor with the demo cookie set', async () => {
    authMock.mockResolvedValue({ userId: null });
    cookiesGetMock.mockReturnValue({ value: '1' });
    findUniqueOrThrowMock.mockResolvedValue({ id: 'athlete_demo', deletedAt: null });
    const { getCurrentAthleteId } = await importFresh();

    await expect(getCurrentAthleteId()).resolves.toBe('athlete_demo');
    expect(findUniqueOrThrowMock).toHaveBeenCalledWith({
      where: { clerkUserId: 'demo' },
      select: { id: true, deletedAt: true },
    });
  });

  it('prefers a real Clerk session over a stray demo cookie', async () => {
    authMock.mockResolvedValue({ userId: 'user_known' });
    cookiesGetMock.mockReturnValue({ value: '1' });
    findUniqueMock.mockResolvedValue({ id: 'athlete_123', deletedAt: null });
    const { getCurrentAthleteId } = await importFresh();

    await expect(getCurrentAthleteId()).resolves.toBe('athlete_123');
    expect(findUniqueOrThrowMock).not.toHaveBeenCalledWith({
      where: { clerkUserId: 'demo' },
      select: { id: true, deletedAt: true },
    });
  });

  it('refuses to resolve without a session', async () => {
    authMock.mockResolvedValue({ userId: null });
    const { getCurrentAthleteId } = await importFresh();

    await expect(getCurrentAthleteId()).rejects.toThrow(/without an authenticated session/);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('returns the existing profile id for a known Clerk user', async () => {
    authMock.mockResolvedValue({ userId: 'user_known' });
    findUniqueMock.mockResolvedValue({ id: 'athlete_123', deletedAt: null });
    const { getCurrentAthleteId } = await importFresh();

    await expect(getCurrentAthleteId()).resolves.toBe('athlete_123');
    expect(createMock).not.toHaveBeenCalled();
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { clerkUserId: 'user_known' },
      select: { id: true, deletedAt: true },
    });
  });

  it('starts a deleted athlete over when their identity signs back in', async () => {
    authMock.mockResolvedValue({ userId: 'user_returning' });
    findUniqueMock.mockResolvedValue({ id: 'athlete_gone', deletedAt: new Date('2026-09-01') });
    createMock.mockResolvedValue({ id: 'athlete_fresh' });
    const { getCurrentAthleteId } = await importFresh();

    await expect(getCurrentAthleteId()).resolves.toBe('athlete_fresh');
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { id: 'athlete_gone' } });
    expect(createMock).toHaveBeenCalledWith({ data: { clerkUserId: 'user_returning' } });
  });

  it('rejects a session racing a deletion that is still settling', async () => {
    authMock.mockResolvedValue({ userId: 'user_deleting' });
    findUniqueMock.mockResolvedValue({ id: 'athlete_gone', deletedAt: new Date() });
    const { getCurrentAthleteId } = await importFresh();

    await expect(getCurrentAthleteId()).rejects.toThrow(/Compte supprimé/);
    expect(deleteManyMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('lets two parallel first requests after a deletion share one fresh profile', async () => {
    authMock.mockResolvedValue({ userId: 'user_returning' });
    findUniqueMock.mockResolvedValue({ id: 'athlete_gone', deletedAt: new Date('2026-09-01') });
    createMock.mockRejectedValue(uniqueConstraintError());
    findUniqueOrThrowMock.mockResolvedValue({ id: 'athlete_fresh', deletedAt: null });
    const { getCurrentAthleteId } = await importFresh();

    await expect(getCurrentAthleteId()).resolves.toBe('athlete_fresh');
  });

  it('never provisions a profile for an identity Clerk just deleted', async () => {
    authMock.mockResolvedValue({ userId: 'user_just_deleted' });
    findUniqueMock.mockResolvedValue(null);
    getUserMock.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));
    const { getCurrentAthleteId } = await importFresh();

    await expect(getCurrentAthleteId()).rejects.toThrow(/Compte supprimé/);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('still provisions a first profile when Clerk is merely unreachable', async () => {
    authMock.mockResolvedValue({ userId: 'user_new' });
    findUniqueMock.mockResolvedValue(null);
    getUserMock.mockRejectedValue(Object.assign(new Error('timeout'), { status: 503 }));
    createMock.mockResolvedValue({ id: 'athlete_new' });
    const { getCurrentAthleteId } = await importFresh();

    await expect(getCurrentAthleteId()).resolves.toBe('athlete_new');
  });

  it('lazily provisions a profile for a brand-new Clerk user', async () => {
    authMock.mockResolvedValue({ userId: 'user_new' });
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: 'athlete_new' });
    const { getCurrentAthleteId } = await importFresh();

    await expect(getCurrentAthleteId()).resolves.toBe('athlete_new');
    expect(createMock).toHaveBeenCalledWith({ data: { clerkUserId: 'user_new' } });
  });

  it('recovers by reading back the row when two first-requests race the create', async () => {
    authMock.mockResolvedValue({ userId: 'user_racing' });
    findUniqueMock.mockResolvedValue(null);
    createMock.mockRejectedValue(uniqueConstraintError());
    findUniqueOrThrowMock.mockResolvedValue({ id: 'athlete_raced', deletedAt: null });
    const { getCurrentAthleteId } = await importFresh();

    await expect(getCurrentAthleteId()).resolves.toBe('athlete_raced');
    expect(findUniqueOrThrowMock).toHaveBeenCalledWith({
      where: { clerkUserId: 'user_racing' },
      select: { id: true, deletedAt: true },
    });
  });

  it('rejects a soft-deleted row found after a create race', async () => {
    authMock.mockResolvedValue({ userId: 'user_racing_deleted' });
    findUniqueMock.mockResolvedValue(null);
    createMock.mockRejectedValue(uniqueConstraintError());
    findUniqueOrThrowMock.mockResolvedValue({
      id: 'athlete_raced_deleted',
      deletedAt: new Date('2026-09-01'),
    });
    const { getCurrentAthleteId } = await importFresh();

    await expect(getCurrentAthleteId()).rejects.toThrow(/Compte supprimé/);
  });

  it('lets a non-race creation error propagate', async () => {
    authMock.mockResolvedValue({ userId: 'user_broken' });
    findUniqueMock.mockResolvedValue(null);
    createMock.mockRejectedValue(new Error('connection reset'));
    const { getCurrentAthleteId } = await importFresh();

    await expect(getCurrentAthleteId()).rejects.toThrow('connection reset');
    expect(findUniqueOrThrowMock).not.toHaveBeenCalled();
  });
});
