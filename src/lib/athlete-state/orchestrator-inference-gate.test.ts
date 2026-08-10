import { describe, expect, it } from 'vitest';
import {
  shouldForceInferenceOnRefresh,
  shouldSkipTodayPresentationRebuild,
} from '@/lib/athlete-state/orchestrator';

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

describe('shouldSkipTodayPresentationRebuild', () => {
  it('skips on soft app_shell with unchanged snapshot and no new morning', () => {
    expect(
      shouldSkipTodayPresentationRebuild({
        source: 'app_shell',
        syncedProviderCount: 0,
        snapshotChanged: false,
        morningRecalibrationCreated: false,
      }),
    ).toBe(true);
  });

  it('rebuilds after sync, snapshot change, or new morning proposal', () => {
    expect(
      shouldSkipTodayPresentationRebuild({
        source: 'app_shell',
        syncedProviderCount: 1,
        snapshotChanged: false,
        morningRecalibrationCreated: false,
      }),
    ).toBe(false);
    expect(
      shouldSkipTodayPresentationRebuild({
        source: 'app_shell',
        syncedProviderCount: 0,
        snapshotChanged: true,
        morningRecalibrationCreated: false,
      }),
    ).toBe(false);
    expect(
      shouldSkipTodayPresentationRebuild({
        source: 'app_shell',
        syncedProviderCount: 0,
        snapshotChanged: false,
        morningRecalibrationCreated: true,
      }),
    ).toBe(false);
  });

  it('never skips today_refresh', () => {
    expect(
      shouldSkipTodayPresentationRebuild({
        source: 'today_refresh',
        syncedProviderCount: 0,
        snapshotChanged: false,
        morningRecalibrationCreated: false,
      }),
    ).toBe(false);
  });
});
