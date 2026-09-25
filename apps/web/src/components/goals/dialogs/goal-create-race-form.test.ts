import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  buildRaceCreatePayload,
  GoalCreateRaceForm,
  isCompactRaceReady,
} from '@/components/goals/dialogs/goal-create-race-form';

describe('GoalCreateRaceForm compact (onboarding)', () => {
  it('shows only date, format and target', () => {
    const html = renderToStaticMarkup(
      createElement(GoalCreateRaceForm, {
        compact: true,
        priority: 'A',
        onPriorityChange: () => {},
        onSubmit: () => {},
      }),
    );

    expect(html).toContain('Format / distance');
    expect(html).toContain('Objectif visé');
    expect(html).toContain('type="date"');
    expect(html).not.toContain('Nom de la course');
    expect(html).not.toContain('Lieu');
    expect(html).not.toContain('Priorité');
    expect(html).not.toContain('Stratégie');
  });
});

describe('isCompactRaceReady', () => {
  it('requires date, format and target', () => {
    expect(
      isCompactRaceReady({
        targetDate: '2026-09-20',
        raceFormat: 'Half',
        targetPerformance: 'Sub 5h',
      }),
    ).toBe(true);
    expect(
      isCompactRaceReady({
        targetDate: '',
        raceFormat: 'Half',
        targetPerformance: 'Sub 5h',
      }),
    ).toBe(false);
  });
});

describe('buildRaceCreatePayload', () => {
  it('auto-generates the title from format and target when none is typed', () => {
    const fd = new FormData();
    fd.set('targetDate', '2026-09-20');
    fd.set('raceFormat', 'Half Ironman');
    fd.set('targetPerformance', 'Sub 5h00');

    const payload = buildRaceCreatePayload(fd, 'A');
    expect(payload.title).toBe('Half Ironman · Sub 5h00');
    expect(payload.raceFormat).toBe('Half Ironman');
    expect(payload.targetPerformance).toBe('Sub 5h00');
    expect(payload.priority).toBe('A');
  });

  it('keeps a manually typed title when the full form is used', () => {
    const fd = new FormData();
    fd.set('title', 'Ironman Nice');
    fd.set('raceFormat', 'Ironman');
    fd.set('targetPerformance', 'Sub 10h');

    expect(buildRaceCreatePayload(fd, 'none').title).toBe('Ironman Nice');
    expect(buildRaceCreatePayload(fd, 'none').priority).toBeNull();
  });
});
