import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const ensureDemoClerkUser = vi.fn();
const createSignInTicket = vi.fn();

vi.mock('@sharpit/server/lib/demo/demo-identity', () => ({
  ensureDemoClerkUser: () => ensureDemoClerkUser(),
}));
vi.mock('@sharpit/server/lib/auth/sign-in-ticket', async () => ({
  ...(await import('@sharpit/server/lib/auth/ticket-sign-in-url')),
  createSignInTicket: (userId: string) => createSignInTicket(userId),
}));

describe('/demo', () => {
  beforeEach(() => {
    ensureDemoClerkUser.mockResolvedValue('user_demo');
    createSignInTicket.mockResolvedValue('tk_demo');
  });

  it('signs the visitor in to the demo account with a one-time ticket, then opens Today', async () => {
    const { GET } = await import('./route');
    const response = await GET(new NextRequest('https://web.sharpit.app/demo'));
    const location = new URL(response.headers.get('location')!);

    expect(createSignInTicket).toHaveBeenCalledWith('user_demo');
    expect(location.pathname).toBe('/sign-in');
    expect(location.searchParams.get('__clerk_ticket')).toBe('tk_demo');
    expect(location.searchParams.get('redirect_url')).toBe('https://web.sharpit.app/');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('falls back to the sign-in page when Clerk fails', async () => {
    ensureDemoClerkUser.mockRejectedValue(new Error('clerk down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { GET } = await import('./route');
    const response = await GET(new NextRequest('https://web.sharpit.app/demo'));

    expect(response.headers.get('location')).toBe('https://web.sharpit.app/sign-in');
  });
});
