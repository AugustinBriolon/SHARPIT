'use client';

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
import { formatTrainingLoad } from '@/lib/preferences/display-mode';
import { useDisplayMode } from '@/providers/display-mode-provider';

/**
 * What easing this session would actually cost, before it costs it.
 *
 * "Alléger" used to fire on sight and report the result in a toast, which meant
 * reading the change after the fact and pressing undo if it was not what was
 * wanted. A quarter off an hour is obvious; a quarter off 50 minutes rounding to
 * 40, or off a load that carries downstream, is not. Showing both figures side by
 * side turns a guess into a decision.
 */

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
  const { mode } = useDisplayMode();
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
  const loadBefore = session.load != null ? formatTrainingLoad(session.load, mode) : '—';
  const loadAfter = proposal?.load != null ? formatTrainingLoad(proposal.load, mode) : '—';

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
            {/* A real table, because this is tabular data and the meaning was
                carried by an arrow that assistive tech never sees. Read linearly
                the old layout said "Durée 35 min Charge 35 Durée 25 min" —
                two figures with the same label and nothing to tell them apart. */}
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-analysis-border/50 border-b">
                  <th className="text-label pb-2 font-medium">
                    <span className="sr-only">Mesure</span>
                  </th>
                  <th className="text-label pb-2 font-medium">Actuel</th>
                  <th className="text-label pb-2 font-medium">Allégé</th>
                </tr>
              </thead>
              <tbody className="divide-analysis-border/40 divide-y">
                <tr>
                  <th className="text-muted-foreground py-2 text-[13px] font-normal">Durée</th>
                  <td className="text-data text-muted-foreground py-2 text-[15px] tabular-nums">
                    {durationBefore}
                  </td>
                  <td className="text-data text-foreground py-2 text-[15px] font-semibold tabular-nums">
                    {changesDuration ? durationAfter : durationBefore}
                  </td>
                </tr>
                <tr>
                  <th className="text-muted-foreground py-2 text-[13px] font-normal">Charge</th>
                  <td className="text-data text-muted-foreground py-2 text-[15px] tabular-nums">
                    {loadBefore}
                  </td>
                  <td className="text-data text-foreground py-2 text-[15px] font-semibold tabular-nums">
                    {changesLoad ? loadAfter : loadBefore}
                  </td>
                </tr>

                {enduranceLines.map((line, index) => (
                  <tr key={`${line.before}-${line.after}`}>
                    <th className="text-muted-foreground py-2 text-[13px] font-normal">
                      {index === 0 ? 'Déroulé' : ''}
                      <span className="sr-only">{index === 0 ? '' : 'Déroulé, suite'}</span>
                    </th>
                    <td className="text-data text-muted-foreground py-2 text-[13px] tabular-nums">
                      {line.before}
                    </td>
                    <td className="text-data text-foreground py-2 text-[13px] font-medium tabular-nums">
                      {line.after}
                    </td>
                  </tr>
                ))}

                {strengthLines.map((line) => (
                  <tr key={line.label}>
                    <th className="text-muted-foreground py-2 text-[13px] font-normal">
                      {line.label}
                    </th>
                    <td className="text-data text-muted-foreground py-2 text-[13px] tabular-nums">
                      {line.before}
                    </td>
                    <td className="text-data text-foreground py-2 text-[13px] font-medium tabular-nums">
                      {line.after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
