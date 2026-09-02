'use client';

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Markdown } from '@/components/coach/chat/markdown';
import {
  markBriefingSeen,
  shouldOpenBriefingByDefault,
} from '@/components/today/dashboard/daily-briefing-panel-helpers';
import { useDailyBriefing } from '@/hooks/use-coach';
import { cn } from '@/lib/utils';

const PENDING_COPY = 'Briefing dès que les données sont à jour';
/** Collapsed trigger — « le » stays lowercase (no title-case). */
const READ_LABEL = 'Lire le briefing';
const TITLE = 'Briefing du jour';

/**
 * Surfaces the already-persisted DailyBriefing — read-only, no generation.
 *
 * Progressive disclosure: open on first visit / morning; otherwise collapsed
 * behind « Lire le briefing ». Empty and loading never invent placeholder prose.
 */
export function DailyBriefingPanel({ dayKey, className }: { dayKey: string; className?: string }) {
  const { data, isPending, isError } = useDailyBriefing(dayKey);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    setOpen(shouldOpenBriefingByDefault({ dayKey, storage }));
    setHydrated(true);
  }, [dayKey]);

  if (isPending) {
    return null;
  }

  if (isError || !data?.content) {
    return (
      <p className={cn('text-muted-foreground px-0.5 text-sm text-pretty', className)}>
        {PENDING_COPY}
      </p>
    );
  }

  // One title only: summary carries « Briefing du jour » when open — no second heading in the body.
  const label = open ? TITLE : READ_LABEL;

  return (
    <section aria-label={TITLE} className={cn('px-0.5', className)}>
      <details
        className="group border-analysis-border/60 border-t"
        open={hydrated ? open : false}
        onToggle={(event) => {
          const next = event.currentTarget.open;
          setOpen(next);
          markBriefingSeen(dayKey, window.localStorage);
        }}
      >
        <summary className="hover:text-foreground flex cursor-pointer list-none items-center justify-between gap-2 py-2.5 text-sm normal-case [&::-webkit-details-marker]:hidden">
          <span className="text-foreground/85 font-medium normal-case">{label}</span>
          <ChevronRight className="text-muted-foreground/70 size-3.5 shrink-0 transition-transform group-open:rotate-90" />
        </summary>
        <div className="pt-1 pb-3">
          <Markdown variant="compact">{data.content}</Markdown>
        </div>
      </details>
    </section>
  );
}
