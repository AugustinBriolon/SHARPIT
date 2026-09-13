import type { SessionIntensity } from '@prisma/client';
import { cn } from '@/lib/utils';
import { intensityTextColors } from '@/lib/planned-session/sessions';
import type { RearrangePreviewSession } from '@/lib/today/rich/rearrange-preview';

const TONE_SURFACE: Record<RearrangePreviewSession['tone'], string> = {
  tension: 'border-signal-caution/45 bg-signal-caution/10',
  calm: 'border-primary/35 bg-primary/8',
  neutral: 'border-analysis-border/70 bg-background/60',
};

export type RearrangeSessionRailFlow = 'sequence' | 'tally';

export function RearrangeSessionChip({
  session,
  className,
  flow = 'sequence',
}: {
  session: RearrangePreviewSession;
  className?: string;
  flow?: RearrangeSessionRailFlow;
}) {
  const intensityClass =
    session.intensity && session.intensity in intensityTextColors
      ? intensityTextColors[session.intensity as SessionIntensity]
      : 'text-foreground';

  if (flow === 'tally') {
    return (
      <li
        className={cn(
          'flex min-w-0 flex-1 flex-col justify-center rounded-lg border px-3 py-2.5',
          TONE_SURFACE[session.tone],
          className,
        )}
      >
        <p className="text-data text-foreground text-lg leading-none font-semibold tabular-nums">
          {session.dateLabel}
        </p>
        <p className="text-muted-foreground mt-1.5 text-[11px] leading-snug text-pretty">
          {session.intensityLabel}
        </p>
      </li>
    );
  }

  return (
    <li
      className={cn(
        'shrink-0 rounded-md border px-2.5 py-1.5 transition-colors duration-150',
        TONE_SURFACE[session.tone],
        className,
      )}
    >
      <p className="text-label text-muted-foreground leading-none">{session.dateLabel}</p>
      <p className={cn('mt-1 text-xs font-medium tabular-nums', intensityClass)}>
        {session.intensityLabel}
      </p>
    </li>
  );
}

function SequenceRailItems({ sessions }: { sessions: readonly RearrangePreviewSession[] }) {
  return sessions.map((session, index) => (
    <div key={session.id} className="flex shrink-0 items-center gap-2">
      <RearrangeSessionChip flow="sequence" session={session} />
      {index < sessions.length - 1 ? (
        <span className="text-muted-foreground/50 hidden text-xs sm:inline" aria-hidden>
          →
        </span>
      ) : null}
    </div>
  ));
}

function TallyRailItems({ sessions }: { sessions: readonly RearrangePreviewSession[] }) {
  return sessions.map((session) => (
    <RearrangeSessionChip key={session.id} flow="tally" session={session} />
  ));
}

export function RearrangeSessionRail({
  sessions,
  ariaLabel,
  caption,
  flow = 'sequence',
}: {
  sessions: readonly RearrangePreviewSession[];
  ariaLabel: string;
  /** Optional lab-note above the rail (e.g. habit tension). */
  caption?: string;
  /**
   * `sequence` — séances chronologiques (flèches, chips shrink).
   * `tally` — faits semaine parallèles (bandeau fill, sans flèches).
   */
  flow?: RearrangeSessionRailFlow;
}) {
  if (sessions.length === 0) {
    return null;
  }

  const isTally = flow === 'tally';

  return (
    <div className="space-y-1.5">
      {caption ? <p className="text-label text-muted-foreground/90">{caption}</p> : null}
      <ol
        aria-label={ariaLabel}
        className={cn(
          isTally
            ? 'flex w-full gap-2'
            : 'flex [scrollbar-width:none] gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden',
        )}
      >
        {isTally ? (
          <TallyRailItems sessions={sessions} />
        ) : (
          <SequenceRailItems sessions={sessions} />
        )}
      </ol>
    </div>
  );
}
