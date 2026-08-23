'use client';

import { ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ClientPlannedSession } from '@/lib/query/types';
import { easeSession } from '@/lib/training/thread/session-adjust';
import { cn } from '@/lib/utils';

/**
 * What easing this session would actually cost, before it costs it.
 *
 * "Alléger" used to fire on sight and report the result in a toast, which meant
 * reading the change after the fact and pressing undo if it was not what was
 * wanted. A quarter off an hour is obvious; a quarter off 50 minutes rounding to
 * 40, or off a load that carries downstream, is not. Showing both figures side by
 * side turns a guess into a decision.
 */

function Figure({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="text-label">{label}</p>
      <p
        className={cn(
          'text-data mt-1 text-lg font-semibold tabular-nums',
          muted ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function ThreadEaseDialog({
  session,
  open,
  onOpenChange,
  onConfirm,
}: {
  session: ClientPlannedSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const proposal = easeSession(session);

  const durationBefore = session.durationMin != null ? `${session.durationMin} min` : '—';
  const durationAfter = proposal?.durationMin != null ? `${proposal.durationMin} min` : '—';
  const loadBefore = session.load != null ? `${Math.round(session.load)} TSS` : '—';
  const loadAfter = proposal?.load != null ? `${Math.round(proposal.load)} TSS` : '—';

  const changesDuration =
    proposal?.durationMin != null && proposal.durationMin !== session.durationMin;
  const changesLoad =
    proposal?.load != null && Math.round(proposal.load) !== Math.round(session.load ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alléger la séance</DialogTitle>
          <DialogDescription>{session.title ?? 'Séance prévue'}</DialogDescription>
        </DialogHeader>

        {proposal ? (
          <>
            <div className="border-analysis-border/50 rounded-analysis grid grid-cols-[1fr_auto_1fr] items-center gap-4 border px-4 py-3.5">
              <div className="space-y-3">
                <Figure label="Durée" value={durationBefore} muted />
                <Figure label="Charge" value={loadBefore} muted />
              </div>

              <ArrowRight className="text-muted-foreground/60 size-4" aria-hidden />

              <div className="space-y-3">
                <Figure label="Durée" value={changesDuration ? durationAfter : durationBefore} />
                <Figure label="Charge" value={changesLoad ? loadAfter : loadBefore} />
              </div>
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed">
              Un quart en moins, sur la durée et la charge ensemble. Réduire l’une sans l’autre
              laisserait le plan réclamer le prix d’origine pour un travail plus court.
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm leading-relaxed">
            Cette séance n’a ni durée ni charge à réduire — il n’y a rien à alléger.
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={proposal == null}
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
