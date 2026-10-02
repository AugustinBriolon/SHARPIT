'use client';

import { Button } from '@sharpit/ui/components/ui/button';
import { DiscussWithCoachButton } from '@/components/coach/discuss/discuss-with-coach-button';
import { Skeleton } from '@sharpit/ui/components/ui/skeleton';
import type { NutritionCoachReadingView } from '@sharpit/app/presentation/nutrition-view-model';
import {
  nutritionReadingJobLabel,
  nutritionReadingToneClass,
} from '@sharpit/app/lib/nutrition/analysis/nutrition-reading-display';
import { cn } from '@sharpit/app/lib/utils';

type ReadyReading = Extract<NutritionCoachReadingView, { state: 'ready' }>;

const TITLE_ID = 'nutrition-coach-reading-title';

function ReadingShell({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section
      aria-labelledby={TITLE_ID}
      className="analysis-panel rounded-analysis-lg space-y-3 p-4 sm:p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-section-title" id={TITLE_ID}>
          Lecture du coach
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function ReadingSkeleton({ label }: { label?: string }) {
  return (
    <ReadingShell>
      <div className="space-y-2.5" role="status" aria-busy>
        <Skeleton className="h-5 w-3/4 rounded-full border-0" />
        <Skeleton className="h-4 w-full rounded-full border-0" />
        <Skeleton className="h-4 w-5/6 rounded-full border-0" />
        {label ? <p className="text-muted-foreground pt-1 text-xs">{label}</p> : null}
      </div>
    </ReadingShell>
  );
}

function ReadingNote({ children }: { children: React.ReactNode }) {
  return (
    <ReadingShell>
      <div className="text-muted-foreground space-y-2 text-sm">{children}</div>
    </ReadingShell>
  );
}

function ReadingContent({
  reading,
  trainingDayId,
}: {
  reading: ReadyReading;
  trainingDayId: string;
}) {
  return (
    <ReadingShell
      aside={
        reading.refreshing ? (
          <span className="text-muted-foreground text-xs" role="status">
            Mise à jour…
          </span>
        ) : null
      }
    >
      <p
        className={cn(
          'text-lg leading-snug font-semibold text-balance',
          nutritionReadingToneClass(reading.verdict.tone),
        )}
      >
        {reading.verdict.headline}
      </p>
      <ul className="divide-analysis-border/20 divide-y">
        {reading.findings.map((finding) => (
          <li key={finding.job + finding.text} className="space-y-0.5 py-2.5 first:pt-0">
            <p className="text-label text-muted-foreground">
              {nutritionReadingJobLabel(finding.job)}
            </p>
            <p className="text-foreground/90 text-sm leading-relaxed text-pretty">{finding.text}</p>
          </li>
        ))}
      </ul>
      <div className="bg-muted/35 space-y-0.5 rounded-xl px-3 py-2.5">
        <p className="text-label text-muted-foreground">À faire</p>
        <p className="text-sm leading-relaxed font-medium text-pretty">{reading.action.text}</p>
      </div>
      <DiscussWithCoachButton
        className="-ml-2"
        size="sm"
        target={{ kind: 'nutrition', trainingDayId }}
        variant="ghost"
      />
    </ReadingShell>
  );
}

function ReadingByState({
  reading,
  trainingDayId,
  onShowPreviousDay,
}: {
  reading: NutritionCoachReadingView | null;
  trainingDayId: string;
  onShowPreviousDay: () => void;
}) {
  switch (reading?.state) {
    case 'ready':
      return <ReadingContent reading={reading} trainingDayId={trainingDayId} />;
    case 'pending':
      return <ReadingSkeleton label="Le coach lit ta journée…" />;
    case 'awaiting_day_end':
      return (
        <ReadingNote>
          <p>La lecture du coach arrive une fois la journée terminée.</p>
          <Button
            className="-ml-2"
            size="sm"
            type="button"
            variant="ghost"
            onClick={onShowPreviousDay}
          >
            Voir la lecture d&apos;hier
          </Button>
        </ReadingNote>
      );
    case 'unavailable':
      return (
        <ReadingNote>
          <p>Lecture indisponible pour le moment. Elle sera relancée plus tard.</p>
        </ReadingNote>
      );
    default:
      return null;
  }
}

/**
 * Coach reading of the selected day — verdict, 2–3 findings, one action.
 * Today reads once the day is over; the page never waits on the model.
 */
export function NutritionCoachReading({
  reading,
  loading,
  trainingDayId,
  onShowPreviousDay,
}: {
  reading: NutritionCoachReadingView | null;
  loading: boolean;
  /** The day read, which a conversation with the coach is then about. */
  trainingDayId: string;
  onShowPreviousDay: () => void;
}) {
  // Keep a ready reading mounted while values revalidate / placeholder — don't wipe the section.
  if (loading && reading?.state !== 'ready') {
    return <ReadingSkeleton />;
  }
  return (
    <ReadingByState
      reading={reading}
      trainingDayId={trainingDayId}
      onShowPreviousDay={onShowPreviousDay}
    />
  );
}
