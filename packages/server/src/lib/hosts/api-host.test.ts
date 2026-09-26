import { describe, expect, it } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  API_ALLOWED_ORIGIN,
  isApiHostPath,
  isApiHostRequest,
  screenApiHostRequest,
  sealApiHostResponse,
} from './api-host';

function request(url: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(url, { method: init.method ?? 'GET', headers: init.headers ?? {} });
}

describe('api host guards', () => {
  it('recognises the api host only', () => {
    expect(isApiHostRequest(request('https://api.sharpit.app/api/v1/today'))).toBe(true);
    expect(isApiHostRequest(request('https://sharpit.app/api/v1/today'))).toBe(false);
    expect(isApiHostRequest(request('https://web.sharpit.app/api/v1/today'))).toBe(false);
  });

  it('serves the native contract and the coach stream, nothing else', () => {
    expect(isApiHostPath('/api/v1/today')).toBe(true);
    expect(isApiHostPath('/api/coach/chat')).toBe(true);
    expect(isApiHostPath('/api/coach/plan')).toBe(false);
    expect(isApiHostPath('/api/cron/sync')).toBe(false);
    expect(isApiHostPath('/.well-known/apple-app-site-association')).toBe(false);
    expect(isApiHostPath('/connect/garmin')).toBe(false);
    expect(isApiHostPath('/')).toBe(false);
  });

  it('answers pages and apex-only routes with a JSON 404, never HTML', async () => {
    for (const path of ['/', '/welcome', '/sign-in', '/.well-known/apple-app-site-association']) {
      const response = screenApiHostRequest(request(`https://api.sharpit.app${path}`));
      expect(response?.status).toBe(404);
      expect(response?.headers.get('content-type')).toContain('application/json');
    }
  });

  it('refuses a request without a Bearer with a JSON 401', async () => {
    const response = screenApiHostRequest(
      request('https://api.sharpit.app/api/v1/today', { headers: { cookie: '__session=x' } }),
    );
    expect(response?.status).toBe(401);
    expect(await response?.json()).toEqual({ error: 'Bearer token required' });
    expect(response?.headers.get('cache-control')).toBe('private, no-store');
  });

  it('lets a Bearer request through to authentication', () => {
    const response = screenApiHostRequest(
      request('https://api.sharpit.app/api/v1/today', { headers: { authorization: 'Bearer abc' } }),
    );
    expect(response).toBeNull();
  });

  it('answers preflights for the thin web only', () => {
    const allowed = screenApiHostRequest(
      request('https://api.sharpit.app/api/v1/today', {
        method: 'OPTIONS',
        headers: { origin: API_ALLOWED_ORIGIN },
      }),
    );
    const other = screenApiHostRequest(
      request('https://api.sharpit.app/api/v1/today', {
        method: 'OPTIONS',
        headers: { origin: 'https://evil.example' },
      }),
    );

    expect(allowed?.status).toBe(204);
    expect(allowed?.headers.get('access-control-allow-origin')).toBe(API_ALLOWED_ORIGIN);
    expect(allowed?.headers.get('access-control-allow-headers')).toContain('Authorization');
    expect(other?.status).toBe(403);
    expect(other?.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('strips cookies, forbids caching and never allows any origin but the thin web', () => {
    const passthrough = NextResponse.next();
    passthrough.headers.set('set-cookie', '__session=leak; Path=/');
    passthrough.headers.set('access-control-allow-origin', '*');

    const sealed = sealApiHostResponse(
      request('https://api.sharpit.app/api/v1/today', {
        headers: { origin: 'https://evil.example' },
      }),
      passthrough,
    );

    expect(sealed.headers.get('set-cookie')).toBeNull();
    expect(sealed.headers.get('cache-control')).toBe('private, no-store');
    expect(sealed.headers.get('access-control-allow-origin')).toBeNull();
  });
});
