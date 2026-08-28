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
import { useDisplayMode } from '@/providers/display-mode-provider';
import { buildThreadEaseDialogData } from '@/components/training/thread/thread-ease-dialog-helpers';

function ThreadEaseProposalTable({
  durationBefore,
  durationAfter,
  loadBefore,
  loadAfter,
  changesDuration,
  changesLoad,
  enduranceLines,
  strengthLines,
}: ReturnType<typeof buildThreadEaseDialogData>) {
  return (
    <>
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
              <th className="text-muted-foreground py-2 text-[13px] font-normal">{line.label}</th>
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
  const { mode } = useDisplayMode();
  const easeData = buildThreadEaseDialogData(session, mode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Alléger la séance</DialogTitle>
          <DialogDescription>{session.title ?? 'Séance prévue'}</DialogDescription>
        </DialogHeader>

        {easeData.proposal ? (
          <ThreadEaseProposalTable {...easeData} />
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
            disabled={easeData.proposal === null}
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
