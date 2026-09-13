import type { SessionIntensity } from '@prisma/client';
import { cn } from '@/lib/utils';
import { intensityTextColors } from '@/lib/planned-session/sessions';
import type { RearrangePreviewSession } from '@/lib/today/rich/rearrange-preview';

const TONE_SURFACE: Record<RearrangePreviewSession['tone'], string> = {
  tension: 'border-signal-caution/45 bg-signal-caution/10',
  calm: 'border-primary/35 bg-primary/8',
  neutral: 'border-analysis-border/70 bg-background/60',
};

const TONE_SURFACE_INK: Record<RearrangePreviewSession['tone'], string> = {
  tension: 'border-signal-caution/50 bg-signal-caution/20',
  calm: 'border-highlight/45 bg-highlight/15',
  neutral: 'border-ink-surface-foreground/25 bg-ink-surface-foreground/8',
};

export type RearrangeSessionRailFlow = 'sequence' | 'tally';

function toneClass(tone: RearrangePreviewSession['tone'], onInk: boolean): string {
  return onInk ? TONE_SURFACE_INK[tone] : TONE_SURFACE[tone];
}

function intensityClassFor(
  intensity: RearrangePreviewSession['intensity'],
  onInk: boolean,
): string {
  if (intensity && intensity in intensityTextColors) {
    return intensityTextColors[intensity as SessionIntensity];
  }
  return onInk ? 'text-ink-surface-foreground' : 'text-foreground';
}

function TallyChip({
  session,
  onInk,
  className,
}: {
  session: RearrangePreviewSession;
  onInk: boolean;
  className?: string;
}) {
  return (
    <li
      className={cn(
        'flex min-w-0 flex-1 items-baseline gap-2 border px-3 py-3',
        onInk
          ? 'first:rounded-l-lg last:rounded-r-lg [&:not(:first-child)]:border-l-0'
          : 'rounded-lg',
        toneClass(session.tone, onInk),
        className,
      )}
    >
      <p
        className={cn(
          'text-data text-xl leading-none font-semibold tabular-nums',
          onInk ? 'text-highlight dark:text-ink-surface-foreground' : 'text-foreground',
        )}
      >
        {session.dateLabel}
      </p>
      <p
        className={cn(
          'min-w-0 text-[11px] leading-snug text-pretty',
          onInk ? 'text-ink-surface-foreground/70' : 'text-muted-foreground',
        )}
      >
        {session.intensityLabel}
      </p>
    </li>
  );
}

function SequenceChip({
  session,
  onInk,
  className,
}: {
  session: RearrangePreviewSession;
  onInk: boolean;
  className?: string;
}) {
  return (
    <li
      className={cn(
        'shrink-0 rounded-md border px-2.5 py-1.5 transition-colors duration-150',
        toneClass(session.tone, onInk),
        className,
      )}
    >
      <p
        className={cn(
          'text-label leading-none',
          onInk ? 'text-ink-surface-foreground/55' : 'text-muted-foreground',
        )}
      >
        {session.dateLabel}
      </p>
      <p
        className={cn(
          'mt-1 text-xs font-medium tabular-nums',
          intensityClassFor(session.intensity, onInk),
        )}
      >
        {session.intensityLabel}
      </p>
    </li>
  );
}

export function RearrangeSessionChip({
  session,
  className,
  flow = 'sequence',
  onInk = false,
}: {
  session: RearrangePreviewSession;
  className?: string;
  flow?: RearrangeSessionRailFlow;
  onInk?: boolean;
}) {
  if (flow === 'tally') {
    return <TallyChip className={className} session={session} onInk={onInk} />;
  }
  return <SequenceChip className={className} session={session} onInk={onInk} />;
}

function SequenceRailItems({
  sessions,
  onInk,
}: {
  sessions: readonly RearrangePreviewSession[];
  onInk: boolean;
}) {
  return sessions.map((session, index) => (
    <div key={session.id} className="flex shrink-0 items-center gap-2">
      <SequenceChip session={session} onInk={onInk} />
      {index < sessions.length - 1 ? (
        <span
          className={cn(
            'hidden text-xs sm:inline',
            onInk ? 'text-ink-surface-foreground/40' : 'text-muted-foreground/50',
          )}
          aria-hidden
        >
          →
        </span>
      ) : null}
    </div>
  ));
}

function TallyRailItems({
  sessions,
  onInk,
}: {
  sessions: readonly RearrangePreviewSession[];
  onInk: boolean;
}) {
  return sessions.map((session) => <TallyChip key={session.id} session={session} onInk={onInk} />);
}

function RailList({
  sessions,
  ariaLabel,
  isTally,
  onInk,
}: {
  sessions: readonly RearrangePreviewSession[];
  ariaLabel: string;
  isTally: boolean;
  onInk: boolean;
}) {
  return (
    <ol
      aria-label={ariaLabel}
      className={
        isTally
          ? cn('flex w-full', onInk ? 'gap-0' : 'gap-2')
          : 'flex [scrollbar-width:none] gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden'
      }
    >
      {isTally ? (
        <TallyRailItems sessions={sessions} onInk={onInk} />
      ) : (
        <SequenceRailItems sessions={sessions} onInk={onInk} />
      )}
    </ol>
  );
}

export function RearrangeSessionRail({
  sessions,
  ariaLabel,
  caption,
  flow = 'sequence',
  onInk = false,
}: {
  sessions: readonly RearrangePreviewSession[];
  ariaLabel: string;
  caption?: string;
  flow?: RearrangeSessionRailFlow;
  onInk?: boolean;
}) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      {caption ? (
        <p
          className={cn(
            'text-label',
            onInk ? 'text-ink-surface-foreground/55' : 'text-muted-foreground/90',
          )}
        >
          {caption}
        </p>
      ) : null}
      <RailList
        ariaLabel={ariaLabel}
        isTally={flow === 'tally'}
        sessions={sessions}
        onInk={onInk}
      />
    </div>
  );
}
