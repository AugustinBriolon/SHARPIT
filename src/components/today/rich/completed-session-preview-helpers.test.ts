import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import {
  activityMayHaveRoutePath,
  completedPreviewDetailsClass,
  completedPreviewFadeClass,
  completedPreviewGridClass,
  completedPreviewTitleClass,
  isPreviewMapPending,
  resolveBatchPreviewPath,
  resolveCompletedSessionMapSlot,
  resolvePreviewUsablePath,
  selectCompletedPreviewMetrics,
  hasUsableRoutePath,
} from './completed-session-preview-helpers';

describe('completed-session-preview-helpers', () => {
  it('treats strength as never having a route path', () => {
    expect(activityMayHaveRoutePath(ActivityType.STRENGTH)).toBe(false);
    expect(activityMayHaveRoutePath(ActivityType.RUN)).toBe(true);
  });

  it('keeps the Plan rail split even at phone width', () => {
    expect(completedPreviewGridClass('split', true)).toContain('grid-cols-[minmax(0,42%)');
    expect(completedPreviewGridClass('column', true)).toContain('sm:grid-cols-');
    expect(completedPreviewGridClass('column', true)).not.toContain('42%');
  });

  it('stacks the Plan rail as map above metrics on every width', () => {
    expect(completedPreviewGridClass('stack', true)).toContain(
      'grid-rows-[8rem_minmax(7.5rem,1fr)]',
    );
    expect(completedPreviewGridClass('stack', false)).toContain(
      'grid-rows-[8rem_minmax(7.5rem,1fr)]',
    );
    expect(completedPreviewDetailsClass('stack', true)).not.toContain('sm:pl-2');
    expect(completedPreviewTitleClass('stack')).toContain('leading-snug');
    expect(completedPreviewTitleClass('stack')).not.toContain('truncate');
  });

  it('keeps stack KPI count to two so values stay in their columns', () => {
    const metrics = [
      { label: 'Distance', value: '3.08', unit: 'km' },
      { label: 'Durée', value: '14:31', unit: 'min' },
      { label: 'Allure', value: '4:43', unit: '/km' },
    ];
    expect(selectCompletedPreviewMetrics(metrics, 'stack')).toEqual(metrics.slice(0, 2));
    expect(selectCompletedPreviewMetrics(metrics, 'column')).toEqual(metrics);
  });

  it('fades the map onto the card token, not a hardcoded white', () => {
    expect(completedPreviewDetailsClass('stack', true)).toContain('bg-card');
    expect(completedPreviewDetailsClass('stack', true)).not.toContain('#fff');
    expect(completedPreviewFadeClass('stack')).toContain('to-card');
    expect(completedPreviewFadeClass('stack')).not.toContain('to-white');
    expect(completedPreviewFadeClass('column')).toContain('to-card');
  });

  it('does not reopen a map slot when the stream is already known empty', () => {
    expect(
      resolveCompletedSessionMapSlot({
        mayHavePath: true,
        isPending: true,
        isError: false,
        usablePath: null,
        rememberedHasPath: false,
      }),
    ).toBe(false);
    expect(
      resolveCompletedSessionMapSlot({
        mayHavePath: true,
        isPending: true,
        isError: false,
        usablePath: null,
        rememberedHasPath: true,
      }),
    ).toBe(true);
  });

  it('requires at least two path points', () => {
    expect(hasUsableRoutePath(null)).toBe(false);
    expect(hasUsableRoutePath([[48.8, 2.3]])).toBe(false);
    expect(
      hasUsableRoutePath([
        [48.8, 2.3],
        [48.81, 2.31],
      ]),
    ).toBe(true);
  });

  it('resolves batch preview paths without treating pending as ready', () => {
    expect(resolveBatchPreviewPath({ status: 'pending' })).toBeNull();
    expect(
      resolveBatchPreviewPath({
        status: 'ready',
        path: [
          [1, 2],
          [3, 4],
        ],
      }),
    ).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(resolveBatchPreviewPath({ status: 'ready', path: null })).toBeNull();
  });

  it('prefers batch path over stream when in batch mode', () => {
    expect(
      resolvePreviewUsablePath({
        batchMode: true,
        batchPath: [
          [1, 1],
          [2, 2],
        ],
        streamPath: [
          [9, 9],
          [8, 8],
        ],
        rememberedPath: null,
      }),
    ).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });

  it('shows pending map slot only while batch is loading', () => {
    expect(
      isPreviewMapPending({
        batchMode: true,
        previewPending: true,
        mayHavePath: true,
        usablePath: null,
        mapEnabled: false,
        streamPending: false,
      }),
    ).toBe(true);
    expect(
      isPreviewMapPending({
        batchMode: true,
        previewPending: false,
        mayHavePath: true,
        usablePath: null,
        mapEnabled: false,
        streamPending: true,
      }),
    ).toBe(false);
  });
});
