'use client';

import { Sparkles, type LucideIcon } from 'lucide-react';
import { ExperimentDaySegments } from '@/components/journal/analyses/experiment-day-segments';
import { TodayInstrumentCard } from '@/components/today/dashboard/today-instrument-card';
import type {
  TodayJournalHabitBridge,
  TodayJournalHabitCallout,
  TodayJournalHabitExperimentBridge,
} from '@sharpit/app/lib/journal/journal-habit-today-bridge';
import { journalTrackableById } from '@sharpit/app/lib/journal/journal-trackables';

/** Lime icon-well glyph — same chrome as sleep / regularity / nutrition. */
function HabitInstrumentIcon({ factorId }: { factorId: string }) {
  const Icon: LucideIcon = journalTrackableById(factorId)?.icon ?? Sparkles;
  return <Icon className="size-3.5" strokeWidth={2.25} />;
}

function parseProgressLabel(label: string): { day: number; total: number } | null {
  const match = /^J(\d+)\s*\/\s*(\d+)$/i.exec(label.trim());
  if (!match) {
    return null;
  }
  return { day: Number(match[1]), total: Number(match[2]) };
}

function ExperimentHero({ experiment }: { experiment: TodayJournalHabitExperimentBridge }) {
  const progress = parseProgressLabel(experiment.progressLabel);

  return (
    <div className="mt-3 flex flex-1 items-center gap-3">
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
        <ExperimentDaySegments label={experiment.segmentsLabel} segments={experiment.segments} />
        <span className="text-muted-foreground text-[11px] leading-snug">
          {experiment.heldLabel}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center self-center pl-1 text-right">
        {progress ? (
          <>
            <span className="text-data text-foreground text-[2.75rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">
              {progress.day}
            </span>
            <span className="text-muted-foreground mt-1 text-[12px] leading-tight">
              sur {progress.total}
              <br />
              jours
            </span>
          </>
        ) : (
          <span className="text-data text-foreground text-sm tabular-nums">
            {experiment.progressLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function AssociationBody({ bridge }: { bridge: TodayJournalHabitBridge }) {
  return (
    <div className="mt-3 flex flex-1 flex-col justify-between gap-3">
      <p className="text-muted-foreground text-xs leading-snug text-pretty">{bridge.meaning}</p>
      <p className="text-muted-foreground/80 text-[11px] leading-relaxed text-pretty">
        {bridge.disclaimer}
        {' · '}
        {bridge.confidenceNote}
      </p>
    </div>
  );
}

function habitCardTitle(callout: TodayJournalHabitCallout): string {
  // Category title like « Score sommeil » / « Régularité » — not the habit name.
  return callout.kind === 'experiment'
    ? callout.experiment.sourceLabel
    : callout.bridge.sourceLabel;
}

function habitCardSubtitle(callout: TodayJournalHabitCallout): string {
  return callout.kind === 'experiment' ? callout.experiment.meaning : callout.bridge.habitLabel;
}

function habitFactorId(callout: TodayJournalHabitCallout): string {
  return callout.kind === 'experiment' ? callout.experiment.factorId : callout.bridge.factorId;
}

/**
 * Journal habit instrument on Résumé — same TodayInstrumentCard chrome as
 * sleep / recovery / regularity / nutrition (title · Lime well · hero metric).
 */
export function TodayJournalHabitBridgeStrip({ callout }: { callout: TodayJournalHabitCallout }) {
  const href = callout.kind === 'experiment' ? callout.experiment.href : callout.bridge.href;
  const title = habitCardTitle(callout);
  const titleAttr =
    callout.kind === 'experiment'
      ? `${callout.experiment.sourceLabel} : ${callout.experiment.meaning}. ${callout.experiment.segmentsLabel}`
      : `${callout.bridge.sourceLabel} : ${callout.bridge.meaning}`;

  return (
    <TodayInstrumentCard
      className="min-h-38 active:scale-[0.988]"
      href={href}
      icon={<HabitInstrumentIcon factorId={habitFactorId(callout)} />}
      subtitle={habitCardSubtitle(callout)}
      title={title}
      titleAttr={titleAttr}
    >
      {callout.kind === 'experiment' ? (
        <ExperimentHero experiment={callout.experiment} />
      ) : (
        <AssociationBody bridge={callout.bridge} />
      )}
    </TodayInstrumentCard>
  );
}
