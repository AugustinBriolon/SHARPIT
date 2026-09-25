import { useId, type ReactNode } from 'react';
import { FadeIn } from '@/components/motion';
import type { JournalHabitReading } from '@/lib/journal/journal-habit-reading';
import { cn } from '@/lib/utils';

function TakeawayStrengths({ reading }: { reading: JournalHabitReading }) {
  if (reading.strengths.length === 0) {
    return null;
  }
  return (
    <ul className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {reading.strengths.map((item) => (
        <li key={`${item.factorId}:${item.polarity}`}>
          <span className="text-foreground/80">Ce qui tient</span>
          {' · '}
          {item.title}
        </li>
      ))}
    </ul>
  );
}

function TakeawayExperience({ experience, titleId }: { experience: ReactNode; titleId: string }) {
  return (
    <div className="border-analysis-border/50 space-y-2 border-t pt-4">
      <p className="text-label" id={titleId}>
        Expérience
      </p>
      <div aria-labelledby={titleId} className="space-y-2">
        {experience}
      </div>
    </div>
  );
}

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
          <TakeawayStrengths reading={reading} />
        </div>
        {experience ? (
          <TakeawayExperience experience={experience} titleId={experienceTitleId} />
        ) : null}
      </section>
    </FadeIn>
  );
}
