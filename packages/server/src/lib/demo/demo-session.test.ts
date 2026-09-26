import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookiesGetMock = vi.fn();
const authMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: cookiesGetMock }),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

describe('isDemoSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesGetMock.mockReturnValue(undefined);
    authMock.mockResolvedValue({ userId: null });
  });

  it('is false when the demo cookie is absent', async () => {
    const { isDemoSession } = await import('./demo-session');

    await expect(isDemoSession()).resolves.toBe(false);
  });

  it('is true when the demo cookie is set and there is no real session', async () => {
    cookiesGetMock.mockReturnValue({ value: '1' });
    const { isDemoSession } = await import('./demo-session');

    await expect(isDemoSession()).resolves.toBe(true);
  });

  it('is false for any other cookie value', async () => {
    cookiesGetMock.mockReturnValue({ value: 'nope' });
    const { isDemoSession } = await import('./demo-session');

    await expect(isDemoSession()).resolves.toBe(false);
  });

  it('is false when a real Clerk session exists, even with the demo cookie set', async () => {
    cookiesGetMock.mockReturnValue({ value: '1' });
    authMock.mockResolvedValue({ userId: 'user_known' });
    const { isDemoSession } = await import('./demo-session');

    await expect(isDemoSession()).resolves.toBe(false);
  });
});
