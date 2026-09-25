import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ai/langfuse', () => ({ isLangfuseConfigured: () => true }));

describe('deleteLangfuseTracesForAthlete', () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];

  beforeEach(() => {
    calls.length = 0;
    vi.stubEnv('LANGFUSE_PUBLIC_KEY', 'pk-lf-fixture');
    vi.stubEnv('LANGFUSE_SECRET_KEY', 'sk-lf-fixture');
    vi.stubEnv('LANGFUSE_BASE_URL', 'https://langfuse.example/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function stubLangfuse(pages: string[][]) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined });
        if (init?.method === 'DELETE') {
          return new Response('{}', { status: 200 });
        }
        const ids = pages.shift() ?? [];
        return Response.json({ data: ids.map((id) => ({ id })) });
      }),
    );
  }

  it('deletes the athlete’s traces until none are left', async () => {
    stubLangfuse([['t1', 't2'], ['t3'], []]);
    const { deleteLangfuseTracesForAthlete } = await import('./langfuse-erasure');

    await expect(deleteLangfuseTracesForAthlete('athlete-1')).resolves.toBe(3);
    expect(calls[0]?.url).toBe(
      'https://langfuse.example/api/public/traces?userId=athlete-1&limit=100&page=1',
    );
    expect(calls.filter((c) => c.method === 'DELETE').map((c) => c.body)).toEqual([
      JSON.stringify({ traceIds: ['t1', 't2'] }),
      JSON.stringify({ traceIds: ['t3'] }),
    ]);
  });

  it('fails loudly when Langfuse refuses, so the caller can log it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 401 })),
    );
    const { deleteLangfuseTracesForAthlete } = await import('./langfuse-erasure');

    await expect(deleteLangfuseTracesForAthlete('athlete-1')).rejects.toThrow(/401/);
  });
});
