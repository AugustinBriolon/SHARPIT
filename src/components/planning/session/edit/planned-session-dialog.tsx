'use client';

import { PlannedSessionNavDismissProvider } from '@/components/planning/session/planned-session-nav-dismiss';
import { usePlannedSessionDialog } from '@/components/planning/session/edit/use-planned-session-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import type { MorningProposalCompareInput } from '@/lib/today/rich/morning-proposal-compare';
import {
  dialogTitle,
  EMPTY_GOALS,
  type CreateMode,
} from '@/components/planning/session/edit/planned-session-dialog-helpers';
import { BrickAnalysisPanel } from '@/components/planning/brick/brick-analysis-panel';
import { PlannedSessionReadView } from '@/components/planning/session/read/planned-session-read-view';
import { PlannedSessionEditForm } from '@/components/planning/session/edit/planned-session-edit-form';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

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

type DialogState = ReturnType<typeof usePlannedSessionDialog>;

function BrickSessionBanner() {
  return (
    <div className="border-primary/30 bg-primary/5 text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
      <Layers className="size-3.5 shrink-0" />
      Cette séance fait partie d&apos;un brick (enchaînement multisport). Tu ne modifies ici que ce
      sport.
    </div>
  );
}

function CreateModeToggle({
  createMode,
  onChange,
}: {
  createMode: CreateMode;
  onChange: (mode: CreateMode) => void;
}) {
  return (
    <div className="border-border/60 bg-muted/30 flex gap-1 rounded-lg border p-1">
      <button
        type="button"
        className={cn(
          'pressable flex-1 rounded-md px-3 py-1.5 text-sm font-medium',
          createMode === 'single'
            ? 'bg-highlight text-highlight-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
        onClick={() => onChange('single')}
      >
        Séance simple
      </button>
      <button
        type="button"
        className={cn(
          'pressable flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
          createMode === 'brick'
            ? 'bg-highlight text-highlight-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
        onClick={() => onChange('brick')}
      >
        <Layers className="size-3.5" />
        Brick
      </button>
    </div>
  );
}

export function PlannedSessionReadBody({
  dialog,
  goals,
  morningProposal,
  omitLinkedActivityNavigation,
}: {
  dialog: DialogState;
  goals: ClientGoal[];
  morningProposal?: MorningProposalCompareInput;
  omitLinkedActivityNavigation: boolean;
}) {
  const session = dialog.liveSession;
  if (!session) {
    return null;
  }

  return (
    <>
      {session.brickGroupId ? (
        <>
          <BrickSessionBanner />
          <BrickAnalysisPanel brickGroupId={session.brickGroupId} />
        </>
      ) : null}
      <PlannedSessionReadView
        context={dialog.contextQuery.data?.context}
        contextPending={dialog.contextQuery.isPending}
        goals={dialog.linkableGoals.length > 0 ? dialog.linkableGoals : goals}
        morningProposal={morningProposal}
        omitLinkedActivityNavigation={omitLinkedActivityNavigation}
        session={session}
        onEdit={dialog.handleStartEdit}
      />
    </>
  );
}

export function PlannedSessionEditBody({
  dialog,
  session,
}: {
  dialog: DialogState;
  session?: ClientPlannedSession | null;
}) {
  return (
    <>
      {dialog.isEdit && session?.brickGroupId ? <BrickSessionBanner /> : null}
      {!dialog.isEdit ? (
        <CreateModeToggle createMode={dialog.createMode} onChange={dialog.setCreateMode} />
      ) : null}
      <PlannedSessionEditForm dialog={dialog} />
    </>
  );
}
