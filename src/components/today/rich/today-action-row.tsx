'use client';

import { MorningOrientationActions } from '@/components/today/rich/morning-orientation-actions';
import {
  TodayActionRowHeader,
  TodayActionRowReminders,
  TodayActionRowSessionLists,
} from '@/components/today/rich/today-action-row-parts';
import { TodayJournalHabitBridgeStrip } from '@/components/today/rich/today-journal-habit-bridge-strip';
import { useTodayActionRowDerived } from '@/components/today/rich/use-today-action-row-derived';
import { useTodayJournalHabitBridge } from '@/components/today/rich/use-today-journal-habit-bridge';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { useAppModal } from '@/providers/app-modal-provider';

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
  const derived = useTodayActionRowDerived(vm, loading);
  const habitBridgeQuery = useTodayJournalHabitBridge(!loading);
  const habitBridge = habitBridgeQuery.data?.bridge ?? null;

  return (
    <section aria-busy={loading || undefined} aria-label="Actions du jour" className="space-y-3">
      <TodayActionRowHeader loading={loading} />

      {derived.orientation ? (
        <MorningOrientationActions
          orientation={derived.orientation}
          trainingDayId={trainingDayId}
          onRefreshed={onWellnessCompleted}
        />
      ) : null}

      {habitBridge ? <TodayJournalHabitBridgeStrip bridge={habitBridge} /> : null}

      <TodayActionRowReminders reminders={derived.reminders} />

      <TodayActionRowSessionLists
        derived={derived}
        loading={loading}
        openPlannedSession={openPlannedSession}
        vm={vm}
        onWellnessCompleted={onWellnessCompleted}
      />
    </section>
  );
}
