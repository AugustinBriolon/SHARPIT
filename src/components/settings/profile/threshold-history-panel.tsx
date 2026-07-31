'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ClientThresholdSnapshot } from '@/lib/query/types';
import {
  dedupeThresholdHistory,
  describeThresholdChanges,
} from '@/lib/threshold/threshold-history';
import { cn } from '@/lib/utils';

const THRESHOLD_SOURCE_LABELS: Record<string, string> = {
  estimated: 'estimé',
  garmin: 'Garmin',
  manual: 'manuel',
};

function formatThresholdSource(source: string): string {
  return THRESHOLD_SOURCE_LABELS[source] ?? source;
}

export function ThresholdHistoryPanel({ history }: { history: ClientThresholdSnapshot[] }) {
  const [expanded, setExpanded] = useState(false);
  const deduped = useMemo(() => dedupeThresholdHistory(history), [history]);

  if (deduped.length === 0) return null;

  const entries = deduped.map((snapshot, index) => ({
    snapshot,
    changes: describeThresholdChanges(snapshot, deduped[index + 1]),
  }));

  const latest = entries[0]!;
  const olderCount = entries.length - 1;

  return (
    <div className="bg-muted/30 rounded-analysis border-analysis-border/60 space-y-1.5 border px-3 py-2.5">
      <p className="text-label">Historique</p>

      <div className="space-y-1">
        <p className="text-muted-foreground text-xs">
          {format(latest.snapshot.createdAt, 'd MMM yyyy', { locale: fr })} ·{' '}
          {formatThresholdSource(latest.snapshot.source)}
        </p>
        <ul className="space-y-0.5">
          {latest.changes.map((change) => (
            <li key={change} className="text-foreground text-sm leading-snug">
              <span className="text-data">{change}</span>
            </li>
          ))}
        </ul>
      </div>

      {olderCount > 0 ? (
        <div className="space-y-2">
          <Button
            aria-expanded={expanded}
            className="min-h-11 px-2 text-xs lg:min-h-9"
            type="button"
            variant="ghost"
            onClick={() => setExpanded((open) => !open)}
          >
            <ChevronDown
              className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}
              aria-hidden
            />
            {expanded
              ? 'Masquer l’historique'
              : `Voir l’historique complet (${olderCount} mise${olderCount > 1 ? 's' : ''} antérieure${olderCount > 1 ? 's' : ''})`}
          </Button>

          {expanded ? (
            <ul className="border-analysis-border/60 space-y-3 border-t pt-3">
              {entries.slice(1).map(({ snapshot, changes }) => (
                <li key={snapshot.id} className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    {format(snapshot.createdAt, 'd MMM yyyy', { locale: fr })} ·{' '}
                    {formatThresholdSource(snapshot.source)}
                  </p>
                  <ul className="space-y-0.5">
                    {changes.map((change) => (
                      <li key={change} className="text-sm leading-snug">
                        <span className="text-data text-foreground">{change}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
