import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { isProviderConnectable } from '@sharpit/app/lib/integrations/provider-catalog';

vi.mock('server-only', () => ({}));

/** Renpho's access is unofficial and withdrawn before the App Store launch. */
describe('Renpho, withdrawn', () => {
  it('cannot be connected', () => {
    expect(isProviderConnectable('renpho')).toBe(false);
  });

  it('refuses connect and sync before reading anything', async () => {
    const { POST: connect } = await import('./connect/handler');
    const { POST: sync } = await import('./sync/handler');
    const request = () =>
      new NextRequest('https://api.sharpit.app/api/renpho/connect', { method: 'POST', body: '{}' });

    expect((await connect(request())).status).toBe(503);
    expect((await sync(request())).status).toBe(503);
  });
});
