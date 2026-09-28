import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendTransactionalEmail } from './transactional-email';

const email = { to: 'zoe@example.com', subject: 'Sujet', text: 'Corps' };

describe('sendTransactionalEmail', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends nothing without a Resend key', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendTransactionalEmail(email)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to Resend and never throws on a refusal', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, status: 422 });
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendTransactionalEmail(email)).resolves.toBe(true);
    await expect(sendTransactionalEmail(email)).resolves.toBe(false);
    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(url).toBe('https://api.resend.com/emails');
    expect(JSON.parse(init.body)).toMatchObject({ to: ['zoe@example.com'], subject: 'Sujet' });
  });
});
