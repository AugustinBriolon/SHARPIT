import { describe, expect, it } from 'vitest';
import { GoalKind } from '@prisma/client';
import {
  buildOnboardingGoalPayload,
  isValidMetricDraft,
  isValidRaceDraft,
} from '@/lib/onboarding/intention';

describe('buildOnboardingGoalPayload', () => {
  it('builds a race goal with required date', () => {
    const payload = buildOnboardingGoalPayload('race', {
      title: 'Ironman Nice',
      targetDate: '2026-09-20',
      location: 'Nice',
    });
    expect(payload.kind).toBe(GoalKind.RACE);
    expect(payload.title).toBe('Ironman Nice');
    expect(payload.targetDate).toEqual(new Date('2026-09-20'));
    expect(payload.location).toBe('Nice');
  });

  it('builds a metric goal', () => {
    const payload = buildOnboardingGoalPayload('metric', {
      title: 'FTP 280 W',
      targetValue: 280,
      unit: 'W',
    });
    expect(payload.kind).toBe(GoalKind.METRIC);
    expect(payload.targetValue).toBe(280);
    expect(payload.unit).toBe('W');
  });
});

describe('intention draft validation', () => {
  it('requires title and date for race', () => {
    expect(isValidRaceDraft({ title: '', targetDate: '2026-01-01' })).toBe(false);
    expect(isValidRaceDraft({ title: 'Course', targetDate: '' })).toBe(false);
    expect(isValidRaceDraft({ title: 'Course', targetDate: '2026-01-01' })).toBe(true);
  });

  it('requires title, positive target and unit for metric', () => {
    expect(isValidMetricDraft({ title: 'FTP', targetValue: 0, unit: 'W' })).toBe(false);
    expect(isValidMetricDraft({ title: 'FTP', targetValue: 280, unit: '' })).toBe(false);
    expect(isValidMetricDraft({ title: 'FTP', targetValue: 280, unit: 'W' })).toBe(true);
  });
});
