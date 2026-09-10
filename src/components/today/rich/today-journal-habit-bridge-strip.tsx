'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { ExperimentDaySegments } from '@/components/journal/analyses/experiment-day-segments';
import { FactorIcon } from '@/components/journal/analyses/factor-icon';
import type {
  TodayJournalHabitBridge,
  TodayJournalHabitCallout,
  TodayJournalHabitExperimentBridge,
} from '@/lib/health/journal-habit-today-bridge';

function AssociationBody({ bridge }: { bridge: TodayJournalHabitBridge }) {
  const { sourceLabel, meaning, disclaimer, confidenceNote, ctaLabel, factorId } = bridge;
  return (
    <span className="flex gap-3">
      <FactorIcon factorId={factorId} />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="text-muted-foreground flex items-center gap-1.5 text-[0.7rem] font-medium tracking-wide">
          <BookOpen className="size-3.5 shrink-0" strokeWidth={1.7} aria-hidden />
          {sourceLabel}
        </span>
        <span className="text-foreground block text-sm leading-snug font-medium text-pretty">
          {meaning}
        </span>
        <span className="text-muted-foreground block text-[0.7rem] leading-relaxed text-pretty">
          {disclaimer}
          {' · '}
          {confidenceNote}
        </span>
        <span className="text-primary inline-flex min-h-10 items-center text-xs font-medium">
          {ctaLabel}
          <span
            className="ml-1 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
            aria-hidden
          >
            →
          </span>
        </span>
      </span>
    </span>
  );
}

/**
 * Glanceable test plate: habit icon = what · Jx/7 = where · segment bar = days held.
 * No review-date paragraph — that lives on /journal/analyses.
 */
function ExperimentBody({ experiment }: { experiment: TodayJournalHabitExperimentBridge }) {
  const {
    sourceLabel,
    meaning,
    progressLabel,
    heldLabel,
    segments,
    segmentsLabel,
    ctaLabel,
    factorId,
  } = experiment;

  return (
    <span className="flex gap-3">
      <FactorIcon factorId={factorId} />
      <span className="min-w-0 flex-1 space-y-2">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="text-label text-muted-foreground">{sourceLabel}</span>
            <span className="text-foreground mt-0.5 block text-sm font-semibold tracking-tight text-pretty">
              {meaning}
            </span>
          </span>
          <span className="text-data text-foreground shrink-0 pt-0.5 text-sm">{progressLabel}</span>
        </span>
        <ExperimentDaySegments label={segmentsLabel} segments={segments} />
        <span className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-data text-[0.7rem]">{heldLabel}</span>
          <span className="text-primary inline-flex min-h-9 items-center text-xs font-medium">
            {ctaLabel}
            <span
              className="ml-1 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
              aria-hidden
            >
              →
            </span>
          </span>
        </span>
      </span>
    </span>
  );
}

/**
 * Quiet journal plate at the bottom of Today — association or running test.
 * Test mode is instrument-first (icon + track), not a text dump.
 */
export function TodayJournalHabitBridgeStrip({ callout }: { callout: TodayJournalHabitCallout }) {
  const href = callout.kind === 'experiment' ? callout.experiment.href : callout.bridge.href;
  const ariaLabel =
    callout.kind === 'experiment'
      ? `${callout.experiment.sourceLabel} : ${callout.experiment.meaning}. ${callout.experiment.segmentsLabel}`
      : undefined;

  return (
    <Link
      aria-label={ariaLabel}
      className="analysis-panel border-analysis-border/70 group block px-3 py-3 transition-transform duration-150 ease-out active:scale-[0.99]"
      href={href}
    >
      {callout.kind === 'experiment' ? (
        <ExperimentBody experiment={callout.experiment} />
      ) : (
        <AssociationBody bridge={callout.bridge} />
      )}
    </Link>
  );
}
