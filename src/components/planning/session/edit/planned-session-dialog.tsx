'use client';

import { PlannedSessionNavDismissProvider } from '@/components/planning/session/edit/planned-session-nav-dismiss';
import {
  PlannedSessionEditBody,
  PlannedSessionReadBody,
} from '@/components/planning/session/edit/planned-session-dialog-body';
import { usePlannedSessionDialog } from '@/components/planning/session/edit/use-planned-session-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import type { MorningProposalCompareInput } from '@/lib/today/morning-proposal-compare';
import {
  dialogTitle,
  EMPTY_GOALS,
} from '@/components/planning/session/edit/planned-session-dialog-helpers';

interface PlannedSessionDialogProps {
  session?: ClientPlannedSession | null;
  defaultDate?: Date;
  goals?: ClientGoal[];
  onClose: () => void;
  omitLinkedActivityNavigation?: boolean;
  morningProposal?: MorningProposalCompareInput;
}

function resolveDialogTitle(
  dialog: ReturnType<typeof usePlannedSessionDialog>,
  session?: ClientPlannedSession | null,
) {
  const hasLinkedActivity = Boolean(
    dialog.liveSession?.activityId ?? dialog.liveSession?.activity ?? session?.activityId,
  );
  return dialogTitle(dialog.isEdit, dialog.mode, hasLinkedActivity);
}

export function PlannedSessionDialog({
  session,
  defaultDate,
  goals = EMPTY_GOALS,
  onClose,
  omitLinkedActivityNavigation = false,
  morningProposal,
}: PlannedSessionDialogProps) {
  const dialog = usePlannedSessionDialog({
    session,
    defaultDate,
    goals,
    onClose,
    omitLinkedActivityNavigation,
    morningProposal,
  });

  const showReadMode = dialog.isEdit && dialog.mode === 'read' && dialog.liveSession;
  const showEditMode = !dialog.isEdit || dialog.mode === 'edit';

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="no-scrollbar max-h-[80dvh] min-w-0 overflow-x-hidden overflow-y-auto sm:max-h-[90vh] sm:max-w-2xl">
          <PlannedSessionNavDismissProvider onDismiss={onClose}>
            <DialogHeader className="pr-10">
              <DialogTitle>{resolveDialogTitle(dialog, session)}</DialogTitle>
            </DialogHeader>

            {showReadMode ? (
              <PlannedSessionReadBody
                dialog={dialog}
                goals={goals}
                morningProposal={morningProposal}
                omitLinkedActivityNavigation={omitLinkedActivityNavigation}
              />
            ) : null}

            {showEditMode ? <PlannedSessionEditBody dialog={dialog} session={session} /> : null}
          </PlannedSessionNavDismissProvider>
        </DialogContent>
      </Dialog>
      {dialog.confirmDialog}
    </>
  );
}
