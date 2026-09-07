import { describe } from 'vitest';
import { expect, it } from 'vitest';
import {
  buildCoachContextPresets,
  presetMatchesAttached,
  resolveLatestActivity,
} from '@/lib/coach/chat/coach-context-presets';
import type { ClientActivity } from '@/lib/query/types';

function activity(partial: Partial<ClientActivity> & { id: string; date: Date }): ClientActivity {
  return {
    title: 'Séance',
    type: 'RUN',
    ...partial,
  } as ClientActivity;
}

describe('resolveLatestActivity', () => {
  it('returns null for an empty list', () => {
    expect(resolveLatestActivity([])).toBeNull();
  });

  it('picks the most recent activity by date', () => {
    const older = activity({ id: 'a', date: new Date('2026-09-01T10:00:00Z'), title: 'Old' });
    const newer = activity({ id: 'b', date: new Date('2026-09-07T10:00:00Z'), title: 'New' });
    expect(resolveLatestActivity([older, newer])?.id).toBe('b');
  });
});

describe('buildCoachContextPresets', () => {
  it('marks last-activity unavailable when there are no activities', () => {
    const presets = buildCoachContextPresets([]);
    const last = presets.find((p) => p.id === 'last-activity');
    expect(last?.available).toBe(false);
    expect(last?.context).toBeNull();
  });

  it('builds form and week contexts with distinct labels', () => {
    const presets = buildCoachContextPresets([]);
    const form = presets.find((p) => p.id === 'form-7d');
    const week = presets.find((p) => p.id === 'week');
    expect(form?.context?.label).toBe('Forme · 7 jours');
    expect(week?.context?.label).toMatch(/semaine/i);
    expect(presetMatchesAttached(form!, form!.context)).toBe(true);
    expect(presetMatchesAttached(form!, week!.context)).toBe(false);
  });
});
