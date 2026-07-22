import { describe, expect, it } from 'vitest';
import { syncSinceFromLastSync, syncWindowDays } from '@/lib/integrations/sync-since';

describe('syncSinceFromLastSync', () => {
  it('uses midnight of last sync day', () => {
    const since = syncSinceFromLastSync(new Date('2026-05-04T09:00:00'), 90);
    expect(since.getHours()).toBe(0);
    expect(since.getMinutes()).toBe(0);
    expect(since.getDate()).toBe(4);
    expect(since.getMonth()).toBe(4);
  });

  it('falls back to N days when never synced', () => {
    const since = syncSinceFromLastSync(null, 7);
    const diffDays = syncWindowDays(since);
    expect(diffDays).toBe(8); // 7 jours en arrière + aujourd'hui
  });
});
