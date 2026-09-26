import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  HANDSHAKE_RETRY_COOKIE,
  recoverFromHandshakeFailure,
} from '@sharpit/app/lib/auth/handshake-recovery';

const failure = new Error(
  'Clerk: Handshake token verification failed due to an invalid signature.',
);

function request(url: string, cookies: Record<string, string> = {}): NextRequest {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  return new NextRequest(url, { headers: cookie ? { cookie } : {} });
}

describe('recoverFromHandshakeFailure', () => {
  let logged: unknown[][];

  beforeEach(() => {
    logged = [];
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      logged.push(args);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('leaves errors outside a handshake to the caller', () => {
    expect(recoverFromHandshakeFailure(request('https://sharpit.app/'), failure)).toBeNull();
  });

  it('retries the same URL without any handshake material', () => {
    const response = recoverFromHandshakeFailure(
      request('https://sharpit.app/plan?week=2&__clerk_handshake=SECRETVALUE&__clerk_help=1'),
      failure,
    );
    expect(response?.status).toBe(307);
    expect(response?.headers.get('location')).toBe('https://sharpit.app/plan?week=2');
    expect(response?.headers.get('cache-control')).toBe('no-store');
    expect(response?.cookies.get(HANDSHAKE_RETRY_COOKIE)?.value).toBe('1');
    expect(response?.cookies.get('__clerk_handshake')?.value).toBe('');
  });

  it('recovers when the handshake arrives as a cookie', () => {
    const response = recoverFromHandshakeFailure(
      request('https://sharpit.app/', { __clerk_handshake: 'SECRETVALUE' }),
      failure,
    );
    expect(response?.status).toBe(307);
  });

  it('ends a loop with a readable 503 instead of a 500', async () => {
    const response = recoverFromHandshakeFailure(
      request('https://sharpit.app/?__clerk_handshake=SECRETVALUE', {
        [HANDSHAKE_RETRY_COOKIE]: '2',
      }),
      failure,
    );
    expect(response?.status).toBe(503);
    expect(await response?.text()).toContain('Connexion momentanément indisponible');
  });

  it('never logs the handshake token or the URL', () => {
    recoverFromHandshakeFailure(
      request('https://sharpit.app/?__clerk_handshake=SECRETVALUE'),
      failure,
    );
    const text = JSON.stringify(logged);
    expect(text).not.toContain('SECRETVALUE');
    expect(text).not.toContain('__clerk_handshake=');
    expect(text).toContain('invalid_signature');
  });
});
