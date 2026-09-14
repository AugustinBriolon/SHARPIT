import type { ClientPlannedSession } from '@/lib/query/types';
import { dialogTitle } from '@/components/planning/session/edit/planned-session-dialog-helpers';
import type { usePlannedSessionDialog } from '@/components/planning/session/edit/use-planned-session-dialog';

type DialogState = ReturnType<typeof usePlannedSessionDialog>;

export function sessionHasLinkedActivity(
  liveSession: ClientPlannedSession | null | undefined,
  session?: ClientPlannedSession | null,
): boolean {
  return Boolean(liveSession?.activityId ?? liveSession?.activity ?? session?.activityId);
}

export function resolvePlannedSessionDialogPresentation(
  dialog: DialogState,
  session?: ClientPlannedSession | null,
) {
  const showReadMode = Boolean(dialog.isEdit && dialog.mode === 'read' && dialog.liveSession);
  const showEditMode = !dialog.isEdit || dialog.mode === 'edit';
  const hasLinkedActivity = sessionHasLinkedActivity(dialog.liveSession, session);
  const isRealizedRead = showReadMode && hasLinkedActivity;
  const title = dialogTitle(dialog.isEdit, dialog.mode, hasLinkedActivity);

  return { showReadMode, showEditMode, isRealizedRead, title };
}
