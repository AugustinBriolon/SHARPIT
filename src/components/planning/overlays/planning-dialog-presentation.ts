import type { ClientPlannedSession } from '@/lib/query/types';

function resolveEditSession(
  dialog: { mode: 'edit'; session: ClientPlannedSession } | { mode: 'create'; date: Date } | null,
  deepLinkSession: ClientPlannedSession | null,
) {
  if (dialog?.mode === 'edit') {
    return dialog.session;
  }
  return deepLinkSession;
}

function resolveCreateDefaultDate(
  dialog: { mode: 'edit'; session: ClientPlannedSession } | { mode: 'create'; date: Date } | null,
) {
  if (dialog?.mode === 'create') {
    return dialog.date;
  }
  return new Date();
}

export function getPlannedDialogPresentation(
  dialog: { mode: 'create'; date: Date } | { mode: 'edit'; session: ClientPlannedSession } | null,
  createFromUrl: boolean,
  deepLinkSession: ClientPlannedSession | null,
) {
  const isCreateDialog = dialog?.mode === 'create' || createFromUrl;
  const editSession = resolveEditSession(dialog, deepLinkSession);
  const createDefaultDate = resolveCreateDefaultDate(dialog);
  const showPlannedDialog = isCreateDialog || dialog?.mode === 'edit' || deepLinkSession !== null;

  return { isCreateDialog, showPlannedDialog, editSession, createDefaultDate };
}
