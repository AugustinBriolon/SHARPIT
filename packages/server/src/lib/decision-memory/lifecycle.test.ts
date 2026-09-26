import { describe, expect, it } from 'vitest';
import {
  canRecordAction,
  canTransitionDecisionStatus,
  isTerminalDecisionStatus,
} from './lifecycle';

describe('canTransitionDecisionStatus', () => {
  it('allows PRESENTED to transition to any of ACCEPTED, MODIFIED, REJECTED, EXPIRED', () => {
    expect(canTransitionDecisionStatus('PRESENTED', 'ACCEPTED')).toBe(true);
    expect(canTransitionDecisionStatus('PRESENTED', 'MODIFIED')).toBe(true);
    expect(canTransitionDecisionStatus('PRESENTED', 'REJECTED')).toBe(true);
    expect(canTransitionDecisionStatus('PRESENTED', 'EXPIRED')).toBe(true);
  });

  it('rejects transitions out of a terminal status', () => {
    expect(canTransitionDecisionStatus('ACCEPTED', 'MODIFIED')).toBe(false);
    expect(canTransitionDecisionStatus('EXPIRED', 'ACCEPTED')).toBe(false);
    expect(canTransitionDecisionStatus('REJECTED', 'ACCEPTED')).toBe(false);
  });

  it('rejects a transition to the same terminal status (no self-loops)', () => {
    expect(canTransitionDecisionStatus('ACCEPTED', 'ACCEPTED')).toBe(false);
  });

  it('rejects PRESENTED looping to itself', () => {
    expect(canTransitionDecisionStatus('PRESENTED', 'PRESENTED')).toBe(false);
  });
});

describe('isTerminalDecisionStatus', () => {
  it('PRESENTED is not terminal', () => {
    expect(isTerminalDecisionStatus('PRESENTED')).toBe(false);
  });

  it('ACCEPTED, MODIFIED, REJECTED, EXPIRED are all terminal', () => {
    expect(isTerminalDecisionStatus('ACCEPTED')).toBe(true);
    expect(isTerminalDecisionStatus('MODIFIED')).toBe(true);
    expect(isTerminalDecisionStatus('REJECTED')).toBe(true);
    expect(isTerminalDecisionStatus('EXPIRED')).toBe(true);
  });
});

describe('canRecordAction', () => {
  it('allows ACCEPTED/MODIFIED/REJECTED only from PRESENTED', () => {
    expect(canRecordAction('PRESENTED', 'ACCEPTED')).toBe(true);
    expect(canRecordAction('PRESENTED', 'MODIFIED')).toBe(true);
    expect(canRecordAction('PRESENTED', 'REJECTED')).toBe(true);
    expect(canRecordAction('ACCEPTED', 'ACCEPTED')).toBe(false);
    expect(canRecordAction('EXPIRED', 'REJECTED')).toBe(false);
  });

  it('allows OVERRIDDEN only from ACCEPTED or MODIFIED — a session must exist to override', () => {
    expect(canRecordAction('ACCEPTED', 'OVERRIDDEN')).toBe(true);
    expect(canRecordAction('MODIFIED', 'OVERRIDDEN')).toBe(true);
    expect(canRecordAction('PRESENTED', 'OVERRIDDEN')).toBe(false);
    expect(canRecordAction('REJECTED', 'OVERRIDDEN')).toBe(false);
    expect(canRecordAction('EXPIRED', 'OVERRIDDEN')).toBe(false);
  });
});
