'use client';

import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { ToolActivity } from '@/components/coach/chat/tool-activity';
import {
  buildToolDisplayEntries,
  condensedFailureLabel,
  type ToolDisplayEntry,
} from '@/lib/coach/coach-tool-display';
import type { ToolPartLite } from '@/lib/coach/coach-tool-parts';
import { useSafeMotion, useShouldAnimate } from '@/lib/motion/hooks';
import { fadeTransition } from '@/lib/motion/variants';
import { cn } from '@/lib/utils';

function entryKey(entry: ToolDisplayEntry, index: number): string {
  if (entry.kind === 'single') {
    const { part } = entry;
    return `${part.type}-${part.state ?? 'pending'}-${index}`;
  }
  return `condensed-${entry.titles.join('|')}-${index}`;
}

function CondensedFailures({
  entry,
}: {
  entry: Extract<ToolDisplayEntry, { kind: 'condensed-failures' }>;
}) {
  const label = condensedFailureLabel(entry);
  const titlePreview =
    entry.titles.length > 0
      ? entry.titles.slice(0, 3).join(', ') +
        (entry.titles.length > 3 ? ` +${entry.titles.length - 3}` : '')
      : null;
  const tooltip = [entry.debug, entry.titles.length > 3 ? entry.titles.join(', ') : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      title={tooltip || undefined}
      className={cn(
        'border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs',
      )}
    >
      <X className="size-3.5 shrink-0" />
      <span className="font-medium">{label}</span>
      {titlePreview ? <span className="truncate opacity-80">— {titlePreview}</span> : null}
      {entry.hint ? <span className="truncate opacity-80">· {entry.hint}</span> : null}
    </div>
  );
}

export function ToolActivityList({
  parts,
  streamIdle = true,
}: {
  parts: ToolPartLite[];
  streamIdle?: boolean;
}) {
  const entries = buildToolDisplayEntries(parts);
  const animate = useShouldAnimate({ essential: true });
  const safe = useSafeMotion();

  if (entries.length === 0) return null;

  if (!animate) {
    return (
      <div className="space-y-1.5">
        {entries.map((entry, i) =>
          entry.kind === 'single' ? (
            <ToolActivity key={entryKey(entry, i)} part={entry.part} streamIdle={streamIdle} />
          ) : (
            <CondensedFailures key={entryKey(entry, i)} entry={entry} />
          ),
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <AnimatePresence initial={false} mode="popLayout">
        {entries.map((entry, i) => (
          <motion.div
            key={entryKey(entry, i)}
            animate={safe.animate}
            exit={safe.exit}
            initial={safe.initial}
            transition={fadeTransition}
            layout
          >
            {entry.kind === 'single' ? (
              <ToolActivity part={entry.part} streamIdle={streamIdle} />
            ) : (
              <CondensedFailures entry={entry} />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
