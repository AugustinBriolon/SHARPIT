import { describe, expect, it } from 'vitest';
import type { BriefingDayContext } from '@/lib/briefing/briefing-context';
import type { CoachContext } from '@/lib/coach/coach-context';
import {
  buildDeterministicBriefingFallback,
  validateBriefingContent,
} from '@/lib/briefing/briefing-validation';

const baseDayCtx: BriefingDayContext = {
  phase: 'afternoon',
  dailyPhase: 'SESSION_COMPLETED',
  phaseLabel: "bilan de l'après-midi",
  todayLabel: 'mardi 7 juillet 2026',
  sessionsDoneToday: ["- Vélo · Déblocage (45 min) — à 12:00 · (aujourd'hui)"],
  sessionsYesterday: ['- Natation · Technique (40 min) — à 19:00 · (hier)'],
  sessionsStillPlannedToday: [],
  hasSessionsDoneToday: true,
};

const baseCoachCtx = {
  health: { readinessToday: 84 },
  fitness: { ctl: 50, atl: 40, tsb: 19 },
  races: [
    {
      title: 'Marathon de Versailles',
      date: new Date(),
      location: null,
      priority: 'A',
      raceFormat: null,
      targetPerformance: null,
      daysToGo: 3,
    },
  ],
  physical: [],
  races_filter: undefined,
} as unknown as CoachContext;

describe('validateBriefingContent', () => {
  it('rejects swim attributed to today when only yesterday', () => {
    const content =
      "Ta forme est bonne. Tes séances de déblocage vélo et natation aujourd'hui visent l'entretien.";
    const result = validateBriefingContent(content, baseDayCtx, baseCoachCtx);
    expect(result.valid).toBe(false);
  });

  it('accepts bike today only', () => {
    const content =
      'Readiness à 84/100. Ton vélo de déblocage réalisé ce midi était bien calibré. Récupère ce soir.';
    const result = validateBriefingContent(content, baseDayCtx, baseCoachCtx);
    expect(result.valid).toBe(true);
  });

  it('falls back deterministically without inventing sessions', () => {
    const text = buildDeterministicBriefingFallback(baseDayCtx, baseCoachCtx);
    expect(text).toContain('84/100');
    expect(text).toContain('TSB');
    expect(text.toLowerCase()).not.toContain('natation');
  });
});
