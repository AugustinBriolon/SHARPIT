import type { ExperimentDaySegment } from '@/lib/health/journal-habit-experiment';
import { cn } from '@/lib/utils';

const SEGMENT_CLASS: Record<ExperimentDaySegment, string> = {
  held: 'bg-primary h-1.5 rounded-full',
  missed: 'bg-muted h-1.5 rounded-full',
  pending: 'border-muted-foreground/50 h-0 border-t-2 border-dashed',
};

/** Seven-day held / missed / pending track — shared by analyses banner and Today. */
export function ExperimentDaySegments({
  segments,
  label,
}: {
  segments: readonly ExperimentDaySegment[];
  label: string;
}) {
  return (
    <span aria-label={label} className="flex h-2 items-center gap-1" role="img">
      {segments.map((segment, index) => (
        <span key={index} className={cn('flex-1', SEGMENT_CLASS[segment])} />
      ))}
    </span>
  );
}
