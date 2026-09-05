import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import { derivePostSessionLoop } from '@/components/today/rich/today-action-row-derived-helpers';
import type { TodayViewModel } from '@/core/presentation/today-view-model';

function baseVm(overrides: {
  postSessionLoop: TodayViewModel['postSessionLoop'];
  daySummaryLines?: TodayViewModel['actionRow']['daySummaryLines'];
}): TodayViewModel {
  return {
    postSessionLoop: overrides.postSessionLoop,
    actionRow: {
      daySummaryLines: overrides.daySummaryLines ?? [],
      sessionLinkSuggestions: [],
    },
  } as unknown as TodayViewModel;
}

describe('derivePostSessionLoop', () => {
  const emptyExclusions = {
    activityIds: new Set<string>(),
    plannedSessionIds: new Set<string>(),
  };

  it('hides the twin card when the activity already has a completed preview', () => {
    const vm = baseVm({
      postSessionLoop: {
        visible: true,
        activityId: 'act-1',
        activityTitle: 'Course',
        needsFeeling: false,
        narrativeHref: '/activite/act-1',
        freshnessLine: 'Twin à jour - ta séance est intégrée.',
      },
      daySummaryLines: [
        {
          id: 'act-1',
          kind: 'done',
          href: '/activite/act-1',
          isDone: true,
          primary: 'Course',
          secondary: null,
          activityType: ActivityType.RUN,
        },
      ],
    });

    expect(derivePostSessionLoop(vm, [], emptyExclusions, vm.actionRow.daySummaryLines)).toBeNull();
  });

  it('keeps the loop when the activity is not already previewed', () => {
    const loop = {
      visible: true as const,
      activityId: 'act-2',
      activityTitle: 'Musculation',
      needsFeeling: true,
      narrativeHref: '/activite/act-2',
      freshnessLine: null,
    };
    const vm = baseVm({ postSessionLoop: loop });

    expect(derivePostSessionLoop(vm, [], emptyExclusions)).toEqual(loop);
  });
});
