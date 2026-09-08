'use client';

import Link from 'next/link';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PlanSectionHeading } from '@/components/plan/hub/plan-section-heading';
import { BrickOverviewCard } from '@/components/planning/brick/brick-overview-card';
import { CompletedSessionPreview } from '@/components/today/rich/completed-session-preview';
import { PlannedSessionPreview } from '@/components/today/rich/planned-session-preview';
import { LinkButton } from '@/components/ui/link-button';
import { isHardSessionIntensity } from '@/lib/plan/trajectory/intensity-gate';
import {
  groupHubDoneByDay,
  groupHubRemainingItems,
  hubDoneCardAccessibleName,
  selectHubDoneEntries,
  selectHubRemainingEntries,
} from '@/lib/plan/week/plan-week-previews';
import { brickLegSummaries } from '@/lib/planned-session/brick/brick-sessions';
import { formatPlannedDuration } from '@/lib/planned-session/sessions';
import { buildCompletedSessionMetrics } from '@/lib/today/rich/completed-session-metrics';
import { buildPlannedSessionPreview } from '@/lib/today/rich/planned-session-metrics';
import { TWIN_DRILL_DOWN } from '@/lib/today/navigation/today-twin-navigation';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import { useAppModal } from '@/providers/app-modal-provider';
import type { ClientPlannedSession } from '@/lib/query/types';

const HUB_DONE_CARD_CLASS = 'flex min-w-[min(14rem,100cqi)] flex-1';

function entryDate(entry: ThreadEntry): Date {
  return entry.planned?.date ?? entry.activity?.date ?? new Date();
}

function hubDayLabel(entry: ThreadEntry): string {
  return format(entryDate(entry), 'EEEE d', { locale: fr });
}

function HubDayCaption({ label }: { label: string }) {
  return <p className="text-muted-foreground px-0.5 text-xs font-medium">{label}</p>;
}

function EntryDayLabel({ entry }: { entry: ThreadEntry }) {
  return <HubDayCaption label={hubDayLabel(entry)} />;
}

function PlannedHubPreview({ entry, gated }: { entry: ThreadEntry; gated: boolean }) {
  const { openPlannedSession } = useAppModal();
  const { planned } = entry;
  if (!planned) {
    return null;
  }

  const preview = buildPlannedSessionPreview({
    type: planned.type,
    durationMin: planned.durationMin,
    intensity: planned.intensity,
    load: planned.load,
    title: planned.title,
    description: planned.description,
    accessories: planned.accessories,
    strengthPrescription: planned.strengthPrescription,
  });

  return (
    <li className="space-y-1.5">
      <EntryDayLabel entry={entry} />
      <PlannedSessionPreview
        activityType={entry.type}
        density="compact"
        equipment={preview.equipment}
        metrics={preview.metrics}
        morningChoiceLabel={gated ? 'Intensité en pause' : null}
        secondary={planned.description}
        title={entry.title}
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
        className="h-full"
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

function PlannedHubBrickPreview({
  entries,
  gateActive,
}: {
  entries: ThreadEntry[];
  gateActive: boolean;
}) {
  const { openPlannedSession } = useAppModal();
  const plannedLegs = entries
    .map((entry) => entry.planned)
    .filter((session): session is ClientPlannedSession => Boolean(session));
  if (plannedLegs.length === 0) {
    return null;
  }
  const totalMin = plannedLegs.reduce((sum, session) => sum + (session.durationMin ?? 0), 0);
  const gated =
    gateActive && plannedLegs.some((session) => isHardSessionIntensity(session.intensity));

  return (
    <li className="space-y-1.5">
      <EntryDayLabel entry={entries[0]!} />
      <BrickOverviewCard
        badge={gated ? 'Intensité en pause' : null}
        legs={brickLegSummaries(plannedLegs)}
        subtitle={totalMin > 0 ? formatPlannedDuration(totalMin) : null}
        onOpenLeg={(legId) => openPlannedSession({ sessionId: legId })}
      />
    </li>
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
  const items = groupHubRemainingItems(featured);
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <PlanSectionHeading title="À faire" />
      <ul className="space-y-3">
        {items.map((item) =>
          item.kind === 'brick' ? (
            <PlannedHubBrickPreview key={item.id} entries={item.entries} gateActive={gateActive} />
          ) : (
            <PlannedHubPreview
              key={item.entry.id}
              entry={item.entry}
              gated={gateActive && isHardSessionIntensity(item.entry.planned?.intensity)}
            />
          ),
        )}
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
      <PlanSectionHeading
        title="Réalisé"
        action={
          <LinkButton
            aria-label={overflow > 0 ? `Historique, ${overflow} de plus` : 'Historique'}
            href="/activite"
            size="sm"
            variant="outline"
          >
            <History aria-hidden />
            Historique
          </LinkButton>
        }
      />
      <ul className="@container flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
        {groups.map((group) => {
          const dayLabel = hubDayLabel(group.entries[0]!);
          return (
            <li key={group.dayKey} className="flex flex-1 snap-start flex-col gap-1.5">
              <HubDayCaption label={dayLabel} />
              <div className="flex items-stretch gap-3">
                {group.entries.map((entry) => (
                  <DoneHubPreview key={entry.id} dayLabel={dayLabel} entry={entry} />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
