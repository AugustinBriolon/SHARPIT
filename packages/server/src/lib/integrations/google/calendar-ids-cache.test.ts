import { describe, expect, it, vi } from 'vitest';

vi.mock('@sharpit/server/lib/redis', () => ({ redis: null }));
vi.mock('@sharpit/server/lib/integrations/google/google', () => ({ listCalendars: vi.fn() }));

const { forgetCalendarIds, readableCalendarIds } =
  await import('@sharpit/server/lib/integrations/google/calendar-ids-cache');

function fakeRedis(initial: Record<string, unknown> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    get: vi.fn(async (key: string) => (store.get(key) ?? null) as never),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
      return 'OK' as never;
    }),
    del: vi.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
  };
}

describe('readableCalendarIds', () => {
  it('asks Google once, then reads the stored list', async () => {
    const redis = fakeRedis();
    const listCalendars = vi.fn().mockResolvedValue([{ id: 'primary' }, { id: 'sport@group' }]);

    expect(await readableCalendarIds('a1', 'token', { redis, listCalendars })).toEqual([
      'primary',
      'sport@group',
    ]);
    expect(await readableCalendarIds('a1', 'token', { redis, listCalendars })).toEqual([
      'primary',
      'sport@group',
    ]);
    expect(listCalendars).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith('google:calendar-ids:a1', ['primary', 'sport@group'], {
      ex: 21_600,
    });
  });

  it('keeps each athlete apart', async () => {
    const redis = fakeRedis({ 'google:calendar-ids:a1': ['primary'] });
    const listCalendars = vi.fn().mockResolvedValue([{ id: 'other' }]);
    expect(await readableCalendarIds('a2', 'token', { redis, listCalendars })).toEqual(['other']);
  });

  it('asks Google when Redis is down or absent', async () => {
    const listCalendars = vi.fn().mockResolvedValue([{ id: 'primary' }]);
    const broken = {
      get: vi.fn().mockRejectedValue(new Error('down')),
      set: vi.fn().mockRejectedValue(new Error('down')),
      del: vi.fn(),
    };
    expect(await readableCalendarIds('a1', 't', { redis: broken, listCalendars })).toEqual([
      'primary',
    ]);
    expect(await readableCalendarIds('a1', 't', { redis: null, listCalendars })).toEqual([
      'primary',
    ]);
  });

  it('does not store an empty list', async () => {
    const redis = fakeRedis();
    await readableCalendarIds('a1', 't', { redis, listCalendars: vi.fn().mockResolvedValue([]) });
    expect(redis.set).not.toHaveBeenCalled();
  });
});

describe('forgetCalendarIds', () => {
  it('drops the stored list', async () => {
    const redis = fakeRedis({ 'google:calendar-ids:a1': ['primary'] });
    await forgetCalendarIds('a1', { redis });
    expect(redis.store.has('google:calendar-ids:a1')).toBe(false);
  });
});
