'use client';

import { X } from 'lucide-react';
import { ToolActivity } from '@/components/coach/chat/tool-activity';
import {
  buildToolDisplayEntries,
  condensedFailureLabel,
  type ToolDisplayEntry,
} from '@/lib/coach/coach-tool-display';
import type { ToolPartLite } from '@/lib/coach/coach-tool-parts';
import { cn } from '@/lib/utils';

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

  return (
    <>
      {entries.map((entry, i) =>
        entry.kind === 'single' ? (
          <ToolActivity key={i} part={entry.part} streamIdle={streamIdle} />
        ) : (
          <CondensedFailures key={i} entry={entry} />
        ),
      )}
    </>
  );
}
