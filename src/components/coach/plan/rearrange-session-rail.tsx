import type { SessionIntensity } from '@prisma/client';
import { cn } from '@/lib/utils';
import { intensityTextColors } from '@/lib/planned-session/sessions';
import type { RearrangePreviewSession } from '@/lib/today/rich/rearrange-preview';

const TONE_SURFACE: Record<RearrangePreviewSession['tone'], string> = {
  tension: 'border-signal-caution/45 bg-signal-caution/10',
  calm: 'border-primary/35 bg-primary/8',
  neutral: 'border-analysis-border/70 bg-background/60',
};

export function RearrangeSessionChip({
  session,
  className,
}: {
  session: RearrangePreviewSession;
  className?: string;
}) {
  const intensityClass =
    session.intensity && session.intensity in intensityTextColors
      ? intensityTextColors[session.intensity as SessionIntensity]
      : 'text-foreground';

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

export function RearrangeSessionRail({
  sessions,
  ariaLabel,
}: {
  sessions: readonly RearrangePreviewSession[];
  ariaLabel: string;
}) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <ol
      aria-label={ariaLabel}
      className="flex [scrollbar-width:none] gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
    >
      {sessions.map((session, index) => (
        <div key={session.id} className="flex shrink-0 items-center gap-2">
          <RearrangeSessionChip session={session} />
          {index < sessions.length - 1 ? (
            <span className="text-muted-foreground/50 hidden text-xs sm:inline" aria-hidden>
              →
            </span>
          ) : null}
        </div>
      ))}
    </ol>
  );
}
