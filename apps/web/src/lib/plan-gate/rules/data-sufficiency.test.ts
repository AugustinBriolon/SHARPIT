import { describe, expect, it } from 'vitest';
import { dataSufficiencyRule } from './data-sufficiency';
import { baseContext, baseProposal } from '../test-fixtures';

describe('dataSufficiencyRule', () => {
  it('requires confirmation for THRESHOLD intensity when no thresholds are on file', () => {
    const context = baseContext({ athleteProfile: { hasThresholds: false } });
    const findings = dataSufficiencyRule(context, baseProposal({ intensity: 'THRESHOLD' }));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('REQUIRES_CONFIRMATION');
    expect(findings[0]?.requiredAssumption).toBeTruthy();
  });

  it('is silent when thresholds are on file', () => {
    const context = baseContext({ athleteProfile: { hasThresholds: true } });
    expect(dataSufficiencyRule(context, baseProposal({ intensity: 'VO2MAX' }))).toEqual([]);
  });

  it('is silent for low-intensity sessions regardless of threshold data', () => {
    const context = baseContext({ athleteProfile: { hasThresholds: false } });
    expect(dataSufficiencyRule(context, baseProposal({ intensity: 'ENDURANCE' }))).toEqual([]);
  });

  it('never rejects — only ever confirms', () => {
    const context = baseContext({ athleteProfile: null });
    const findings = dataSufficiencyRule(context, baseProposal({ intensity: 'THRESHOLD' }));
    expect(findings.every((f) => f.severity !== 'REJECTED')).toBe(true);
  });
});
