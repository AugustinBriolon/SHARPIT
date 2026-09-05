import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { queryKeys } from '@/lib/query/keys';
import { patchTodayPostSessionLoopAfterFeeling } from '@/lib/query/patch-post-session-loop';

function baseTodayVm(postSessionLoop: TodayViewModel['postSessionLoop']): TodayViewModel {
  return {
    postSessionLoop,
  } as TodayViewModel;
}

describe('patchTodayPostSessionLoopAfterFeeling', () => {
  it('clears the loop when only the ressenti CTA remained', () => {
    const qc = new QueryClient();
    const dayId = '2026-08-25';
    qc.setQueryData(
      queryKeys.presentationToday(dayId),
      baseTodayVm({
        visible: true,
        activityId: 'a1',
        activityTitle: 'Tempo',
        needsFeeling: true,
        narrativeHref: '/activite/a1',
        freshnessLine: null,
      }),
    );

    patchTodayPostSessionLoopAfterFeeling(qc, 'a1');

    expect(
      qc.getQueryData<TodayViewModel>(queryKeys.presentationToday(dayId))?.postSessionLoop,
    ).toBeNull();
  });

  it('keeps the freshness line when twin is already fresh', () => {
    const qc = new QueryClient();
    const dayId = '2026-08-25';
    qc.setQueryData(
      queryKeys.presentationToday(dayId),
      baseTodayVm({
        visible: true,
        activityId: 'a1',
        activityTitle: 'Tempo',
        needsFeeling: true,
        narrativeHref: '/activite/a1',
        freshnessLine: 'Twin à jour — ta séance est intégrée.',
      }),
    );

    patchTodayPostSessionLoopAfterFeeling(qc, 'a1');

    expect(
      qc.getQueryData<TodayViewModel>(queryKeys.presentationToday(dayId))?.postSessionLoop,
    ).toMatchObject({
      needsFeeling: false,
      freshnessLine: 'Twin à jour — ta séance est intégrée.',
    });
  });

  it('ignores unrelated activities', () => {
    const qc = new QueryClient();
    const dayId = '2026-08-25';
    const vm = baseTodayVm({
      visible: true,
      activityId: 'a1',
      activityTitle: 'Tempo',
      needsFeeling: true,
      narrativeHref: '/activite/a1',
      freshnessLine: null,
    });
    qc.setQueryData(queryKeys.presentationToday(dayId), vm);

    patchTodayPostSessionLoopAfterFeeling(qc, 'other');

    expect(qc.getQueryData<TodayViewModel>(queryKeys.presentationToday(dayId))).toBe(vm);
  });
});
