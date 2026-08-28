'use client';

import { BrickOverviewCard } from '@/components/planning/brick/brick-overview-card';
import { InstrumentListChip } from '@/components/ui/instruments/instrument-list-chip';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import {
  buildDaySummaryMeta,
  daySummaryOpenPlanned,
} from '@/components/today/rich/today-day-summary-line-helpers';

type DaySummaryLine = TodayViewModel['actionRow']['daySummaryLines'][number];

export function TodayDaySummaryLine({
  line,
  isPrimary,
  onOpenPlanned,
}: {
  line: DaySummaryLine;
  isPrimary: boolean;
  onOpenPlanned: (sessionId: string) => void;
}) {
  if (line.brickLegs && line.brickLegs.length > 0) {
    return (
      <BrickOverviewCard
        legs={line.brickLegs}
        subtitle={line.secondary ?? null}
        onOpenLeg={(legId) => onOpenPlanned(legId)}
      />
    );
  }

  const meta = buildDaySummaryMeta(line);
  const openPlanned = daySummaryOpenPlanned(line, onOpenPlanned);

  return (
    <InstrumentListChip
      activityType={line.activityType}
      done={line.isDone}
      href={openPlanned ? undefined : line.href}
      meta={meta}
      primary={isPrimary}
      title={line.primary}
      onClick={openPlanned}
    />
  );
}
