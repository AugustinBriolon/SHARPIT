import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * The production 500, reproduced with the real Clerk SDK: a development instance
 * (pk_test) rethrows a handshake it cannot verify — here the secret key's JWKS cannot be
 * loaded, as with a secret key from another instance. Fixtures only: no real key.
 */
const PK_TEST = `pk_test_${Buffer.from('fixture.clerk.accounts.dev$').toString('base64')}`;

function unverifiableHandshake(): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'RS256', typ: 'JWT', kid: 'ins_fixture' })}.${part({ handshake: [] })}.c2ln`;
}

function documentRequest(): NextRequest {
  return new NextRequest(`https://sharpit.app/?__clerk_handshake=${unverifiableHandshake()}`, {
    headers: { accept: 'text/html', 'sec-fetch-dest': 'document' },
  });
}

describe('Clerk handshake on a development instance', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubMismatchedInstance() {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', PK_TEST);
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_live_fixture');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 401 })),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
  }

  it('throws out of clerkMiddleware — what production served as a 500', async () => {
    stubMismatchedInstance();
    const { clerkMiddleware } = await import('@clerk/nextjs/server');
    await expect(clerkMiddleware(async () => {})(documentRequest(), {} as never)).rejects.toThrow(
      /Handshake/,
    );
  });

  it('is answered by the proxy with a clean retry of the same URL', async () => {
    stubMismatchedInstance();
    const { default: proxy } = await import('@/proxy');
    const response = await proxy(documentRequest(), {} as never);
    expect(response?.status).toBe(307);
    expect(response?.headers.get('location')).toBe('https://sharpit.app/');
  });
});
