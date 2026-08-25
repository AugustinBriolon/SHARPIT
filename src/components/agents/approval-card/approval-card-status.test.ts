import { describe, expect, it } from 'vitest';
import {
  getApprovalStatusBadgeClass,
  getApprovalStatusIconClass,
  getApprovalStatusLabel,
} from '@/components/agents/approval-card/approval-card-status';
import { approvalCardCopy } from '@/components/agents/approval-card/copy';

describe('getApprovalStatusLabel', () => {
  it('returns French labels for terminal states', () => {
    expect(getApprovalStatusLabel('approved')).toBe(approvalCardCopy.status.approved);
    expect(getApprovalStatusLabel('rejected')).toBe(approvalCardCopy.status.rejected);
    expect(getApprovalStatusLabel('pending')).toBe(approvalCardCopy.status.pending);
  });
});

describe('getApprovalStatusIconClass', () => {
  it('uses semantic signal tokens instead of generic palette', () => {
    expect(getApprovalStatusIconClass('rejected')).toContain('signal-risk');
    expect(getApprovalStatusIconClass('pending')).toContain('signal-caution');
    expect(getApprovalStatusIconClass('approved')).not.toContain('emerald');
  });
});

describe('getApprovalStatusBadgeClass', () => {
  it('avoids celebratory success colors', () => {
    expect(getApprovalStatusBadgeClass('approved')).not.toContain('emerald');
    expect(getApprovalStatusBadgeClass('approved')).toContain('muted-foreground');
  });
});
