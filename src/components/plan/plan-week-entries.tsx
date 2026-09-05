'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CompletedSessionPreview } from '@/components/today/rich/completed-session-preview';
import { PlannedSessionPreview } from '@/components/today/rich/planned-session-preview';
import { isHardSessionIntensity } from '@/lib/plan/intensity-gate';
import {
  groupHubDoneByDay,
  hubDoneCardAccessibleName,
  selectHubDoneEntries,
  selectHubRemainingEntries,
} from '@/lib/plan/plan-week-previews';
import { buildCompletedSessionMetrics } from '@/lib/today/completed-session-metrics';
import { buildPlannedSessionMetrics } from '@/lib/today/planned-session-metrics';
import { TWIN_DRILL_DOWN } from '@/lib/today/today-twin-navigation';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import { useAppModal } from '@/providers/app-modal-provider';

const HUB_DONE_CARD_CLASS = 'w-[min(14rem,calc(100cqi-1.5rem))] shrink-0';

function entryDate(entry: ThreadEntry): Date {
  return entry.planned?.date ?? entry.activity?.date ?? new Date();
}

function hubDayLabel(entry: ThreadEntry): string {
  return format(entryDate(entry), 'EEEE d', { locale: fr });
}

function EntryDayLabel({ entry }: { entry: ThreadEntry }) {
  return <p className="text-label px-0.5">{hubDayLabel(entry)}</p>;
}

function PlannedHubPreview({ entry, gated }: { entry: ThreadEntry; gated: boolean }) {
  const { openPlannedSession } = useAppModal();
  const { planned } = entry;
  if (!planned) {
    return null;
  }

  return (
    <li className="space-y-1.5">
      <EntryDayLabel entry={entry} />
      <PlannedSessionPreview
        activityType={entry.type}
        density="compact"
        morningChoiceLabel={gated ? 'Intensité en pause' : null}
        secondary={planned.description}
        title={entry.title}
        metrics={buildPlannedSessionMetrics({
          type: planned.type,
          durationMin: planned.durationMin,
          intensity: planned.intensity,
          load: planned.load,
        })}
        onOpen={() => openPlannedSession({ sessionId: planned.id })}
      />
    </li>
  );
}

function DoneHubPreview({ entry, dayLabel }: { entry: ThreadEntry; dayLabel: string }) {
  const { activity } = entry;
  if (!activity) {
    return null;
  }

  return (
    <div className={HUB_DONE_CARD_CLASS}>
      <CompletedSessionPreview
        accessibleName={hubDoneCardAccessibleName(dayLabel, entry.title)}
        activityId={activity.id}
        activityType={activity.type}
        href={TWIN_DRILL_DOWN.activity(activity.id)}
        layout="stack"
        title={entry.title}
        metrics={buildCompletedSessionMetrics({
          type: activity.type,
          duration: activity.duration,
          load: activity.load,
          rpe: activity.rpe,
          runMetrics: activity.runMetrics,
          bikeMetrics: activity.bikeMetrics,
          swimMetrics: activity.swimMetrics,
          hikeMetrics: activity.hikeMetrics,
          strengthSets: activity.strengthSets ?? [],
        })}
      />
    </div>
  );
}

export function PlanRemainingList({
  entries,
  gateActive,
  excludePlannedId = null,
}: {
  entries: readonly ThreadEntry[];
  gateActive: boolean;
  excludePlannedId?: string | null;
}) {
  const { featured, overflow } = selectHubRemainingEntries(entries, excludePlannedId);
  if (featured.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-label">À faire</p>
      <ul className="space-y-3">
        {featured.map((entry) => (
          <PlannedHubPreview
            key={entry.id}
            entry={entry}
            gated={gateActive && isHardSessionIntensity(entry.planned?.intensity)}
          />
        ))}
      </ul>
      {overflow > 0 ? (
        <Link className="explore-link" href="/plan/semaine">
          {overflow} autre{overflow > 1 ? 's' : ''} prévue{overflow > 1 ? 's' : ''}
        </Link>
      ) : null}
    </div>
  );
}

export function PlanDoneList({ entries }: { entries: readonly ThreadEntry[] }) {
  const { featured, overflow } = selectHubDoneEntries(entries);
  if (featured.length === 0) {
    return null;
  }
  const groups = groupHubDoneByDay(featured);

  return (
    <div className="space-y-2">
      <p className="text-label">Réalisé</p>
      <ul className="@container -mx-1 flex snap-x snap-mandatory scroll-ps-1 gap-3 overflow-x-auto px-1 pe-6 pb-1">
        {groups.map((group) => {
          const dayLabel = hubDayLabel(group.entries[0]!);
          return (
            <li key={group.dayKey} className="flex shrink-0 snap-start flex-col gap-1.5">
              <p className="text-label px-0.5">{dayLabel}</p>
              <div className="flex gap-3">
                {group.entries.map((entry) => (
                  <DoneHubPreview key={entry.id} dayLabel={dayLabel} entry={entry} />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {overflow > 0 ? (
        <Link className="explore-link" href="/activite">
          {overflow} de plus dans l’historique
        </Link>
      ) : null}
    </div>
  );
}
