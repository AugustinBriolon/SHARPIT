import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildAdaptChangeDiff, type AdaptDiffSide } from '@/lib/coach/plan/adapt-change-diff';
import type { AdaptChange } from '@/hooks/use-coach';
import type { ClientPlannedSession } from '@/lib/query/types';

function DiffChip({
  side,
  variant,
}: {
  side: AdaptDiffSide;
  variant: 'before' | 'after' | 'remove' | 'add';
}) {
  return (
    <div
      className={cn(
        'min-w-0 flex-1 rounded-md border px-2.5 py-2',
        variant === 'before' && 'border-analysis-border/70 bg-background/50 text-muted-foreground',
        variant === 'after' && 'border-primary/40 bg-primary/8',
        variant === 'remove' &&
          'border-signal-risk/40 bg-signal-risk/8 text-muted-foreground line-through',
        variant === 'add' && 'border-primary/40 bg-primary/8 border-dashed',
      )}
    >
      <p className="text-label leading-none">{side.dateLabel}</p>
      <p className="mt-1 truncate text-sm font-medium">{side.title}</p>
      {side.meta ? (
        <p className="text-muted-foreground mt-0.5 truncate text-xs">{side.meta}</p>
      ) : null}
    </div>
  );
}

function RemoveDiff({ before }: { before: AdaptDiffSide }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <DiffChip side={before} variant="remove" />
      <Trash2 className="text-signal-risk size-3.5 shrink-0" aria-hidden />
    </div>
  );
}

function AddDiff({ after }: { after: AdaptDiffSide }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <Plus className="text-primary size-3.5 shrink-0" aria-hidden />
      <DiffChip side={after} variant="add" />
    </div>
  );
}

function ModifyDiff({
  before,
  after,
  dateShifted,
}: {
  before: AdaptDiffSide;
  after: AdaptDiffSide;
  dateShifted: boolean;
}) {
  return (
    <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-stretch sm:gap-2">
      <DiffChip side={before} variant="before" />
      <div className="flex shrink-0 items-center justify-center gap-1 self-center">
        <ArrowRight
          className={cn(
            'size-3.5',
            dateShifted ? 'text-signal-caution' : 'text-muted-foreground/60',
          )}
          aria-hidden
        />
        {dateShifted ? (
          <span className="text-signal-caution text-[10px] font-semibold tracking-wide uppercase">
            Décalage
          </span>
        ) : null}
      </div>
      <DiffChip side={after} variant="after" />
    </div>
  );
}

/**
 * Visual before→after strip for one AdaptChange (MODIFY / REMOVE / ADD).
 */
export function AdaptChangeDiffVisual({
  change,
  existing,
}: {
  change: AdaptChange;
  existing: ClientPlannedSession | null;
}) {
  const diff = buildAdaptChangeDiff(change, existing);

  if (diff.action === 'REMOVE' && diff.before) {
    return <RemoveDiff before={diff.before} />;
  }
  if (diff.action === 'ADD' && diff.after) {
    return <AddDiff after={diff.after} />;
  }
  if (diff.action === 'MODIFY' && diff.before && diff.after) {
    return <ModifyDiff after={diff.after} before={diff.before} dateShifted={diff.dateShifted} />;
  }
  return null;
}
