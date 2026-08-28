'use client';

import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { ToolActivity } from '@/components/coach/chat/tool-activity';
import {
  buildToolDisplayEntries,
  condensedFailureLabel,
  type ToolDisplayEntry,
} from '@/lib/coach/chat/coach-tool-display';
import type { ToolPartLite } from '@/lib/coach/chat/coach-tool-parts';
import { useSafeMotion, useShouldAnimate } from '@/lib/motion/hooks';
import { fadeTransition } from '@/lib/motion/variants';

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
  const tooltip = [entry.debug, entry.titles.length > 3 ? entry.titles.join(', ') : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <span
      className="border-destructive/30 bg-destructive/5 text-destructive inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      title={tooltip || undefined}
    >
      <X className="size-3 shrink-0" />
      {label}
    </span>
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

  if (entries.length === 0) {
    return null;
  }

  if (!animate) {
    return (
      <div className="flex flex-wrap gap-1">
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
    <div className="flex flex-wrap gap-1">
      <AnimatePresence initial={false} mode="popLayout">
        {entries.map((entry, i) => (
          <motion.span
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
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
