/** Marker titles for the Today session-link suggestion demo story. */
export const DEMO_SESSION_LINK_PLANNED_TITLE = 'Footing récup — démo liaison';
export const DEMO_LINK_ACTIVITY_TITLE = 'Footing récup — démo liaison (réalisé)';

export function isDemoSessionLinkPlannedTitle(title: string | null | undefined): boolean {
  return title?.trim() === DEMO_SESSION_LINK_PLANNED_TITLE;
}

export function isDemoSessionLinkActivityTitle(title: string | null | undefined): boolean {
  return title?.trim() === DEMO_LINK_ACTIVITY_TITLE;
}
