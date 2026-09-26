import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectRenpho, disconnectGarmin } from './integrations';

describe('integrations fetchers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('connectRenpho returns sync payload from sendJson', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, sync: { imported: 3, updated: 1, days: 90 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(connectRenpho({ email: 'a@b.co', password: 'secret' })).resolves.toEqual({
      success: true,
      sync: { imported: 3, updated: 1, days: 90 },
    });
  });

  it('disconnect* soft-ok swallows sendJson errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Boom' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(disconnectGarmin()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalled();
  });
});
