import { describe, expect, it } from 'vitest';
import { shouldForceInferenceOnRefresh } from '@/lib/athlete-state/orchestrator';

describe('shouldForceInferenceOnRefresh', () => {
  it('keeps soft app_shell opens on Twin cache when nothing synced', () => {
    expect(
      shouldForceInferenceOnRefresh({
        source: 'app_shell',
        forceSync: false,
        syncedProviderCount: 0,
      }),
    ).toBe(false);
  });

  it('forces recompute after provider sync on open', () => {
    expect(
      shouldForceInferenceOnRefresh({
        source: 'app_shell',
        syncedProviderCount: 2,
      }),
    ).toBe(true);
  });

  it('forces recompute for manual today refresh and cron', () => {
    expect(
      shouldForceInferenceOnRefresh({
        source: 'today_refresh',
        syncedProviderCount: 0,
      }),
    ).toBe(true);
    expect(
      shouldForceInferenceOnRefresh({
        source: 'cron',
        syncedProviderCount: 0,
      }),
    ).toBe(true);
  });

  it('forces recompute when forceSync is set', () => {
    expect(
      shouldForceInferenceOnRefresh({
        source: 'app_shell',
        forceSync: true,
        syncedProviderCount: 0,
      }),
    ).toBe(true);
  });
});
