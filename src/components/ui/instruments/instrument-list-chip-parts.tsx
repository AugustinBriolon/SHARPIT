'use client';

import type { ReactNode } from 'react';
import type { ActivityType } from '@prisma/client';
import { CheckCircle2 } from 'lucide-react';
import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { cn } from '@/lib/utils';
import type { InstrumentListChipMeta } from '@/components/ui/instruments/instrument-list-chip';

function metaText(item: InstrumentListChipMeta): string {
  return typeof item === 'string' ? item : item.text;
}

function metaTone(item: InstrumentListChipMeta): 'default' | 'caution' {
  return typeof item === 'string' ? 'default' : (item.tone ?? 'default');
}

export function InstrumentListChipMetaRow({
  activityType,
  meta,
}: {
  activityType?: ActivityType;
  meta: InstrumentListChipMeta[];
}) {
  const hasMetaRow = activityType !== undefined || meta.length > 0;
  if (!hasMetaRow) {
    return null;
  }

  return (
    <span className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
      {activityType !== undefined ? (
        <span className="shrink-0">
          <ActivityTypeIndicator type={activityType} />
        </span>
      ) : null}
      {meta.map((item, index) => (
        <span key={`meta-${index}-${metaText(item)}`} className="contents">
          {activityType !== undefined || index > 0 ? (
            <span className="shrink-0 opacity-30" aria-hidden>
              ·
            </span>
          ) : null}
          <span
            className={cn(
              'text-data min-w-0',
              metaTone(item) === 'caution' && 'text-signal-caution',
            )}
          >
            {metaText(item)}
          </span>
        </span>
      ))}
    </span>
  );
}

export function InstrumentListChipTrailing({
  done,
  primary,
  showArrow,
  trailing,
}: {
  done: boolean;
  primary: boolean;
  showArrow: boolean;
  trailing?: ReactNode;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {done ? <CheckCircle2 className="text-primary size-3.5" aria-hidden /> : null}
      {trailing}
      {primary && !done ? (
        <span
          className="bg-highlight text-highlight-foreground text-data inline-flex size-7 items-center justify-center rounded-full text-xs transition-transform duration-150 group-hover:translate-x-0.5"
          aria-hidden
        >
          →
        </span>
      ) : null}
      {showArrow && !(primary && !done) ? (
        <span
          className="text-muted-foreground/70 text-data text-xs tracking-wider transition-transform duration-150 group-hover:translate-x-0.5"
          aria-hidden
        >
          →
        </span>
      ) : null}
    </span>
  );
}
