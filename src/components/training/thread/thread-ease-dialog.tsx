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
import {
  describeEnduranceEase,
  describeStrengthEase,
} from '@/lib/planned-session/ease-prescription';
import { parseEndurancePrescription } from '@/lib/planned-session/endurance/endurance-prescription';
import { parseStrengthPrescription } from '@/lib/planned-session/strength/strength-prescription';
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

  /* The déroulé lines that actually move. Listing an unchanged warm-up beside
     three reduced intervals buries the reduction in a copy of the workout. */
  const enduranceBefore = parseEndurancePrescription(session.endurancePrescription);
  const enduranceLines =
    enduranceBefore && proposal?.endurancePrescription
      ? describeEnduranceEase(enduranceBefore, proposal.endurancePrescription)
      : [];

  const strengthBefore = parseStrengthPrescription(session.strengthPrescription);
  const strengthLines =
    strengthBefore && proposal?.strengthPrescription
      ? describeStrengthEase(strengthBefore, proposal.strengthPrescription)
      : [];

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
      {/* No cross: "Annuler" is right there and says what it does. Two ways to
          abandon, one of them unlabelled, is one too many on a decision. */}
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
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

            {enduranceLines.length > 0 || strengthLines.length > 0 ? (
              <div>
                <p className="text-label mb-2">Déroulé</p>
                <ul className="divide-analysis-border/40 divide-y">
                  {enduranceLines.map((line) => (
                    <li
                      key={`${line.before}-${line.after}`}
                      className="text-data flex items-center gap-2 py-1.5 text-[13px] tabular-nums"
                    >
                      <span className="text-muted-foreground">{line.before}</span>
                      <ArrowRight className="text-muted-foreground/50 size-3.5" aria-hidden />
                      <span className="text-foreground font-medium">{line.after}</span>
                    </li>
                  ))}
                  {strengthLines.map((line) => (
                    <li key={line.label} className="flex items-center gap-2 py-1.5 text-[13px]">
                      <span className="text-foreground min-w-0 flex-1 truncate">{line.label}</span>
                      <span className="text-data text-muted-foreground tabular-nums">
                        {line.before}
                      </span>
                      <ArrowRight className="text-muted-foreground/50 size-3.5" aria-hidden />
                      <span className="text-data text-foreground font-medium tabular-nums">
                        {line.after}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="text-muted-foreground text-sm leading-relaxed">
              Un quart en moins. Les séries perdent des répétitions plutôt que de la longueur, et
              l’échauffement reste entier — un jour sans en a plus besoin, pas moins.
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
