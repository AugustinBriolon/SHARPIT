'use client';

import { DiscussWithCoachButton } from '@/components/coach/discuss-with-coach-button';
import { MorningOrientationActions } from '@/components/today/rich/morning-orientation-actions';
import {
  TodayActionRowHeader,
  TodayActionRowReminders,
  TodayActionRowSessionLists,
} from '@/components/today/rich/today-action-row-parts';
import { useTodayActionRowDerived } from '@/components/today/rich/use-today-action-row-derived';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { useAppModal } from '@/providers/app-modal-provider';
import { useIsDemoMode } from '@/hooks/use-is-demo-mode';

export function TodayActionRow({
  loading = false,
  onWellnessCompleted,
  trainingDayId,
  vm,
}: {
  vm: TodayViewModel;
  trainingDayId: string;
  onWellnessCompleted?: () => void;
  loading?: boolean;
}) {
  const { openPlannedSession } = useAppModal();
  const isDemo = useIsDemoMode();
  const derived = useTodayActionRowDerived(vm, loading);

  return (
    <section aria-busy={loading || undefined} className="space-y-3">
      <TodayActionRowHeader
        actionLabel={vm.actionRow.actionLabel}
        isDemo={isDemo}
        loading={loading}
        onWellnessCompleted={onWellnessCompleted}
      />

      {derived.orientation ? (
        <MorningOrientationActions
          orientation={derived.orientation}
          trainingDayId={trainingDayId}
          onRefreshed={onWellnessCompleted}
        />
      ) : null}

      <TodayActionRowReminders reminders={derived.reminders} />

      <TodayActionRowSessionLists
        derived={derived}
        loading={loading}
        openPlannedSession={openPlannedSession}
        vm={vm}
        onWellnessCompleted={onWellnessCompleted}
      />

      {loading ? null : (
        <DiscussWithCoachButton
          className="w-full"
          label="Discuter de ma journée"
          size="sm"
          target={{ kind: 'today' }}
        />
      )}
    </section>
  );
}
