'use client';

import Link from 'next/link';
import { addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarRange } from 'lucide-react';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import {
  InstrumentListChip,
  InstrumentListChipSkeleton,
  type InstrumentListChipMeta,
} from '@/components/ui/instruments/instrument-list-chip';
import { PlanWeekStrip } from '@/components/plan/plan-week-strip';
import { entryMeta } from '@/components/training/thread/thread-entry-row-meta';
import { isHardSessionIntensity } from '@/lib/plan/intensity-gate';
import type { PlanWeek } from '@/lib/plan/plan-week';
import { formatTrainingLoad, type DisplayMode } from '@/lib/preferences/display-mode';
import { TWIN_DRILL_DOWN } from '@/lib/today/today-twin-navigation';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import type { OverallVerdict } from '@/lib/today/today-mapping';
import { useAppModal } from '@/providers/app-modal-provider';
import { useDisplayMode } from '@/providers/display-mode-provider';

const PLANNING_HREF = '/training/planning';

function weekRangeLabel(start: Date): string {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = format(start, sameMonth ? 'd' : 'd MMM', { locale: fr });
  return `${startLabel} au ${format(end, 'd MMM', { locale: fr })}`;
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 px-4 py-2.5 sm:block sm:py-3">
      <p className="text-label shrink-0">{label}</p>
      <p className="text-instrument text-foreground text-sm font-medium sm:mt-1">{value}</p>
    </div>
  );
}

/**
 * A recorded load is a fact, a prescribed load is an intention, and the gap
 * between them is the only part an athlete can act on. Hence side by side.
 *
 * Both distinguish "zero" from "not known": a week of five sessions with no TSS
 * must not read 0, and neither must a plan whose sessions carry no estimate.
 */
function WeekFigures({ mode, week }: { mode: DisplayMode; week: PlanWeek }) {
  const doneLabel = week.doneLoadKnown ? formatTrainingLoad(week.doneLoad, mode) : 'non mesurée';
  const plannedLabel =
    week.plannedLoad > 0 ? formatTrainingLoad(week.plannedLoad, mode) : 'non estimée';
  const sessionsTotal = week.done.length + week.remaining.length;

  return (
    <div className="analysis-panel divide-analysis-border/60 divide-y sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <Figure label="Réalisé" value={doneLabel} />
      <Figure label="Prévu" value={plannedLabel} />
      <Figure label="Séances" value={`${week.done.length}/${sessionsTotal}`} />
    </div>
  );
}

function entryChipMeta(entry: ThreadEntry, mode: DisplayMode, gated: boolean) {
  const meta: InstrumentListChipMeta[] = [
    format(entry.planned?.date ?? entry.activity?.date ?? new Date(), 'EEE d', { locale: fr }),
    ...entryMeta(entry, mode),
  ];
  if (gated) {
    meta.push({ text: 'intensité en pause', tone: 'caution' });
  }
  return meta;
}

function PlanEntryChip({
  entry,
  gateActive,
  mode,
}: {
  entry: ThreadEntry;
  gateActive: boolean;
  mode: DisplayMode;
}) {
  const { openPlannedSession } = useAppModal();
  const isPlanned = entry.kind === 'planned';
  const gated = gateActive && isPlanned && isHardSessionIntensity(entry.planned?.intensity);

  if (isPlanned && entry.planned) {
    const sessionId = entry.planned.id;
    return (
      <li>
        <InstrumentListChip
          activityType={entry.type}
          meta={entryChipMeta(entry, mode, gated)}
          title={entry.title}
          onClick={() => openPlannedSession({ sessionId })}
        />
      </li>
    );
  }

  return (
    <li>
      <InstrumentListChip
        activityType={entry.type}
        href={entry.activity ? TWIN_DRILL_DOWN.activity(entry.activity.id) : undefined}
        meta={entryChipMeta(entry, mode, false)}
        showArrow={false}
        title={entry.title}
        done
      />
    </li>
  );
}

function EntryGroup({
  entries,
  gateActive,
  mode,
  title,
}: {
  entries: readonly ThreadEntry[];
  gateActive: boolean;
  mode: DisplayMode;
  title: string;
}) {
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2">
      <p className="text-label">{title}</p>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <PlanEntryChip key={entry.id} entry={entry} gateActive={gateActive} mode={mode} />
        ))}
      </ul>
    </div>
  );
}

/** Why a prescribed intensity is being held back, in the athlete's terms. */
function GateNotice({ verdictLabel, count }: { verdictLabel: string; count: number }) {
  return (
    <p className="annotation-clinical text-muted-foreground text-xs leading-relaxed">
      Today annonce <span className="text-foreground font-medium">{verdictLabel}</span>. Les {count}{' '}
      séance{count > 1 ? 's' : ''} dure{count > 1 ? 's' : ''} rest{count > 1 ? 'ent' : 'e'} au plan,
      mais mieux vaut les alléger ou les décaler tant que la récupération n’a pas suivi.
    </p>
  );
}

export function PlanWeekSectionSkeleton() {
  return (
    <section className="space-y-3" aria-busy>
      <div className="analysis-panel-alt rounded-analysis-lg h-16 animate-pulse" />
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="analysis-panel-alt rounded-analysis-sm h-12 animate-pulse" />
        ))}
      </div>
      <div className="space-y-2">
        <InstrumentListChipSkeleton />
        <InstrumentListChipSkeleton titleWidth="w-32" />
      </div>
    </section>
  );
}

function WeekEmpty() {
  return (
    <InkEmptyState
      description="Aucune séance prévue ni réalisée cette semaine. Sans plan posé, il n’y a rien à comparer et aucune projection à tenir."
      icon={CalendarRange}
      title="Semaine vide"
      action={
        <Link className="explore-link" href={PLANNING_HREF}>
          Construire la semaine
        </Link>
      }
    />
  );
}

function WeekBody({
  gateActive,
  gatedCount,
  mode,
  verdictLabel,
  week,
}: {
  gateActive: boolean;
  gatedCount: number;
  mode: DisplayMode;
  verdictLabel: string | null;
  week: PlanWeek;
}) {
  return (
    <>
      <WeekFigures mode={mode} week={week} />
      <PlanWeekStrip days={week.days} />

      {gateActive && verdictLabel ? (
        <GateNotice count={gatedCount} verdictLabel={verdictLabel} />
      ) : null}

      <EntryGroup entries={week.remaining} gateActive={gateActive} mode={mode} title="À faire" />
      <EntryGroup entries={week.done} gateActive={false} mode={mode} title="Réalisé" />
    </>
  );
}

/**
 * The week as one canonical list: prescribed and recorded in the same section.
 *
 * Gated hard sessions are marked, not hidden. Plan is where the athlete reads
 * what he committed to, and a page that quietly drops a session he can still
 * see in the calendar is a page he stops trusting.
 */
export function PlanWeekSection({
  gatedCount,
  verdict,
  verdictLabel,
  week,
}: {
  gatedCount: number;
  verdict: OverallVerdict | null;
  verdictLabel: string | null;
  week: PlanWeek;
}) {
  const { mode } = useDisplayMode();

  return (
    <section aria-labelledby="plan-week" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-section-title" id="plan-week">
          Semaine du {weekRangeLabel(week.start)}
        </h2>
        <Link className="explore-link shrink-0" href={PLANNING_HREF}>
          Planification
        </Link>
      </div>

      {week.isEmpty ? (
        <WeekEmpty />
      ) : (
        <WeekBody
          gateActive={gatedCount > 0 && Boolean(verdict)}
          gatedCount={gatedCount}
          mode={mode}
          verdictLabel={verdictLabel}
          week={week}
        />
      )}
    </section>
  );
}
