'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { guardedActionLabel } from '@/hooks/use-offline-guard';
import { cn } from '@/lib/utils';

export function MorningEvidencePending({
  evidenceLine,
  offline,
  offlineLabel,
  onRefresh,
  pending,
}: {
  evidenceLine?: string | null;
  offline: boolean;
  offlineLabel: string;
  onRefresh: () => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-2">
      {evidenceLine ? (
        <p className="text-muted-foreground px-0.5 text-xs leading-relaxed">{evidenceLine}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={offline || pending}
          size="sm"
          type="button"
          variant="accent"
          onClick={onRefresh}
        >
          <RefreshCw className={cn('size-3.5', pending && 'animate-spin')} />
          {guardedActionLabel(offline, offlineLabel, 'Actualiser les données', {
            active: pending,
            label: 'Actualisation…',
          })}
        </Button>
      </div>
    </div>
  );
}
