/** Reasons attached to tool approval responses — surfaced to the model on continue. */
export const COACH_APPROVAL_REASON = {
  approved: 'Validé par l’athlète',
  denied:
    'Refusé par l’athlète — ne pas appliquer cette action ; proposer une alternative ou demander une précision',
} as const;

export function coachApprovalReason(approved: boolean): string {
  return approved ? COACH_APPROVAL_REASON.approved : COACH_APPROVAL_REASON.denied;
}
