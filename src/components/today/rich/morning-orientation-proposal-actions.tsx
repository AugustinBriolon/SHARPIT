'use client';

import { Button } from '@/components/ui/button';
import { guardedActionLabel } from '@/hooks/use-offline-guard';

export function MorningOrientationProposalActions({
  busy,
  offline,
  offlineLabel,
  onAccept,
  onReject,
  pending,
}: {
  busy: boolean;
  offline: boolean;
  offlineLabel: string;
  onAccept: () => void;
  onReject: () => void;
  pending: 'refresh' | 'hold' | 'apply' | null;
}) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
      <Button
        className="h-11 w-full rounded-full lg:h-9 lg:w-auto"
        disabled={offline || busy}
        type="button"
        variant="highlight"
        onClick={onAccept}
      >
        {guardedActionLabel(offline, offlineLabel, 'Appliquer la proposée', {
          active: pending === 'apply',
          label: 'Application…',
        })}
      </Button>
      <Button
        className="h-11 w-full lg:h-9 lg:w-auto"
        disabled={offline || busy}
        type="button"
        variant="ghost"
        onClick={onReject}
      >
        {guardedActionLabel(offline, offlineLabel, 'Garder le plan', {
          active: pending === 'hold',
          label: 'Conservation…',
        })}
      </Button>
    </div>
  );
}
