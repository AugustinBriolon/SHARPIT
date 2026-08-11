import { describe, expect, it } from 'vitest';
import { coachApprovalReason, COACH_APPROVAL_REASON } from '@/lib/coach/coach-approval-reason';

describe('coachApprovalReason', () => {
  it('marks denial so the model must not treat the action as done', () => {
    expect(coachApprovalReason(false)).toBe(COACH_APPROVAL_REASON.denied);
    expect(coachApprovalReason(false).toLowerCase()).toContain('refusé');
  });

  it('marks approval explicitly', () => {
    expect(coachApprovalReason(true)).toBe(COACH_APPROVAL_REASON.approved);
  });
});
