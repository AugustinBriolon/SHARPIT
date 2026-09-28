import { afterEach, describe, expect, it, vi } from 'vitest';

const update = vi.fn().mockReturnValue({ catch: () => undefined });
vi.mock('@sharpit/db/client', () => ({ prisma: { deviceToken: { update } } }));
vi.mock('@sharpit/server/lib/push/apns', () => ({
  apnsConfigFor: () => ({}),
  isTokenExpiredOrInvalid: (status: number) => status === 410,
  sendApnsNotification: vi.fn(),
}));

const { sendApnsNotification } = await import('@sharpit/server/lib/push/apns');
const { sendPushToDevices } = await import('./athlete-push');

const payload = { aps: { alert: { title: 'T', body: 'B' } } };

describe('sendPushToDevices', () => {
  afterEach(() => vi.clearAllMocks());

  it('says why APNs refused a push, without the token', async () => {
    vi.mocked(sendApnsNotification).mockResolvedValue({
      success: false,
      status: 403,
      reason: 'InvalidProviderToken',
      deviceToken: 'secret-token',
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await sendPushToDevices(
      [{ token: 'secret-token', environment: 'sandbox' }],
      payload,
    );

    expect(result).toEqual({ sent: 0, failed: 1, deactivated: 0 });
    expect(warn).toHaveBeenCalledWith('[push] APNs refused', {
      environment: 'sandbox',
      status: 403,
      reason: 'InvalidProviderToken',
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-token');
  });

  it('switches off a device APNs says is gone', async () => {
    vi.mocked(sendApnsNotification).mockResolvedValue({
      success: false,
      status: 410,
      reason: 'Unregistered',
      deviceToken: 't',
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await sendPushToDevices([{ token: 't', environment: 'production' }], payload);

    expect(result.deactivated).toBe(1);
    expect(update).toHaveBeenCalledWith({ where: { token: 't' }, data: { enabled: false } });
  });
});
