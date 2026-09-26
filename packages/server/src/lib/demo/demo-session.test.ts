import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.fn();
const getUserList = vi.fn();

vi.mock('server-only', () => ({}));
vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
  clerkClient: async () => ({ users: { getUserList } }),
}));

describe('isDemoSession', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: null });
    getUserList.mockResolvedValue({ data: [{ id: 'user_demo' }] });
    (await import('./demo-identity')).resetDemoIdentityCache();
  });

  it('is false without a Clerk session', async () => {
    const { isDemoSession } = await import('./demo-session');
    await expect(isDemoSession()).resolves.toBe(false);
  });

  it('is true for the shared demo Clerk user', async () => {
    authMock.mockResolvedValue({ userId: 'user_demo' });
    const { isDemoSession } = await import('./demo-session');
    await expect(isDemoSession()).resolves.toBe(true);
  });

  it('is false for any real athlete', async () => {
    authMock.mockResolvedValue({ userId: 'user_known' });
    const { isDemoSession } = await import('./demo-session');
    await expect(isDemoSession()).resolves.toBe(false);
  });

  it('is false when the demo user does not exist yet', async () => {
    authMock.mockResolvedValue({ userId: 'user_known' });
    getUserList.mockResolvedValue({ data: [] });
    const { isDemoSession } = await import('./demo-session');
    await expect(isDemoSession()).resolves.toBe(false);
  });
});
