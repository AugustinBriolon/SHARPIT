'use client';

import { BrickOverviewCard } from '@/components/planning/brick/brick-overview-card';
import { CompletedSessionPreview } from '@/components/today/rich/completed-session-preview';
import { PlannedSessionPreview } from '@/components/today/rich/planned-session-preview';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { daySummaryOpenPlanned } from '@/components/today/rich/today-day-summary-line-helpers';

type DaySummaryLine = TodayViewModel['actionRow']['daySummaryLines'][number];

function BrickDaySummaryLine({
  line,
  onOpenPlanned,
}: {
  line: DaySummaryLine;
  onOpenPlanned: (sessionId: string) => void;
}) {
  return (
    <BrickOverviewCard
      legs={line.brickLegs!}
      subtitle={line.secondary ?? null}
      onOpenLeg={(legId) => onOpenPlanned(legId)}
    />
  );
}

function DoneDaySummaryLine({ line }: { line: DaySummaryLine }) {
  return (
    <CompletedSessionPreview
      activityId={line.id}
      activityType={line.activityType}
      href={line.href}
      metrics={line.metrics ?? []}
      title={line.primary}
    />
  );
}

function PlannedDaySummaryLine({
  line,
  isPrimary,
  sessionCount,
  onOpenPlanned,
}: {
  line: DaySummaryLine;
  isPrimary: boolean;
  sessionCount: number;
  onOpenPlanned: (sessionId: string) => void;
}) {
  const openPlanned = daySummaryOpenPlanned(line, onOpenPlanned);
  return (
    <PlannedSessionPreview
      activityType={line.activityType}
      density={sessionCount <= 1 ? 'solo' : 'compact'}
      metrics={line.metrics ?? []}
      morningChoiceLabel={line.morningChoiceLabel}
      primary={isPrimary}
      secondary={line.secondary}
      title={line.primary}
      onOpen={openPlanned ?? (() => undefined)}
    />
  );
}

function hasBrickLegs(line: DaySummaryLine): boolean {
  return Boolean(line.brickLegs && line.brickLegs.length > 0);
}

export function TodayDaySummaryLine({
  line,
  isPrimary,
  sessionCount = 1,
  onOpenPlanned,
}: {
  line: DaySummaryLine;
  isPrimary: boolean;
  /** Total visible session cards in the section — drives planned density. */
  sessionCount?: number;
  onOpenPlanned: (sessionId: string) => void;
}) {
  if (hasBrickLegs(line)) {
    return <BrickDaySummaryLine line={line} onOpenPlanned={onOpenPlanned} />;
  }

  if (line.isDone) {
    return <DoneDaySummaryLine line={line} />;
  }

  return (
    <PlannedDaySummaryLine
      isPrimary={isPrimary}
      line={line}
      sessionCount={sessionCount}
      onOpenPlanned={onOpenPlanned}
    />
  );
}
