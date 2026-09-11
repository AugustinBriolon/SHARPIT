import { useId, type ReactNode } from 'react';
import { FadeIn } from '@/components/motion';
import type { JournalHabitReading } from '@/lib/journal/journal-habit-reading';
import { cn } from '@/lib/utils';

export function TakeawayPlate({
  reading,
  experience,
  className,
}: {
  reading: JournalHabitReading;
  /** Suggested experiment CTA, or the live « en test » status when one is running. */
  experience?: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  const experienceTitleId = useId();

  return (
    <FadeIn>
      <section
        aria-labelledby={titleId}
        className={cn('analysis-panel-alt space-y-4 px-4 py-4 sm:px-5 sm:py-5', className)}
      >
        <div className="space-y-2">
          <p className="text-label">À retenir</p>
          <h2 className="text-verdict text-pretty" id={titleId}>
            {reading.verdict}
          </h2>
          <p className="text-muted-foreground text-data text-xs">{reading.summary}</p>
        </div>
        {experience ? (
          <div className="border-analysis-border/50 space-y-2 border-t pt-4">
            <p className="text-label" id={experienceTitleId}>
              Expérience
            </p>
            <div aria-labelledby={experienceTitleId} className="space-y-2">
              {experience}
            </div>
          </div>
        ) : null}
      </section>
    </FadeIn>
  );
}
