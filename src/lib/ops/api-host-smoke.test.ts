import { describe, expect, it } from 'vitest';
import { runApiHostSmoke } from './api-host-smoke';

const ORIGIN = 'https://api.sharpit.app';
const DAY = '2026-09-25';
const TODAY = `/api/v1/today?trainingDayId=${DAY}`;
const SEALED = { 'content-type': 'application/json', 'cache-control': 'private, no-store' };

type Reply = { status: number; headers?: Record<string, string> };

function fetcherFor(replies: (path: string, init: RequestInit) => Reply) {
  return async (url: string, init: RequestInit) => {
    const reply = replies(url.slice(ORIGIN.length), init);
    return new Response(reply.status === 204 ? null : '{}', {
      status: reply.status,
      headers: reply.headers,
    });
  };
}

function healthyApi(path: string, init: RequestInit): Reply {
  const headers = new Headers(init.headers);
  if (init.method === 'OPTIONS') {
    return headers.get('origin') === 'https://web.sharpit.app'
      ? { status: 204, headers: { 'access-control-allow-origin': 'https://web.sharpit.app' } }
      : { status: 403, headers: SEALED };
  }
  if (path !== TODAY) {
    return { status: 404, headers: SEALED };
  }
  return { status: headers.get('authorization') ? 200 : 401, headers: SEALED };
}

describe('runApiHostSmoke', () => {
  it('passes against an api host that keeps its contract', async () => {
    const results = await runApiHostSmoke(ORIGIN, {
      bearer: 'token',
      trainingDayId: DAY,
      fetcher: fetcherFor(healthyApi),
    });

    expect(results.map((result) => result.outcome)).toEqual(Array(6).fill('pass'));
  });

  it('fails an api host that still serves the whole web app', async () => {
    const webApp = fetcherFor((path): Reply =>
      path === '/'
        ? { status: 307, headers: { location: '/welcome' } }
        : {
            status: 404,
            headers: { 'content-type': 'text/html', 'access-control-allow-origin': '*' },
          },
    );

    const results = await runApiHostSmoke(ORIGIN, { trainingDayId: DAY, fetcher: webApp });

    expect(results.slice(0, 5).every((result) => result.outcome === 'fail')).toBe(true);
    expect(results[5]).toMatchObject({ outcome: 'skipped' });
  });

  it('fails a response that sets a cookie or allows any origin', async () => {
    const leaky = fetcherFor((path, init) => {
      const reply = healthyApi(path, init);
      return path === '/' ? { ...reply, headers: { ...SEALED, 'set-cookie': 'a=b' } } : reply;
    });

    const results = await runApiHostSmoke(ORIGIN, { trainingDayId: DAY, fetcher: leaky });

    expect(results[1]).toMatchObject({ outcome: 'fail', reason: 'sets a cookie' });
  });
});
