import { describe, expect, it } from 'vitest';
import { buildCapStatDetail } from '@/lib/goals/goal-cap-stat-detail';
import type { GoalCapStatsView } from '@/lib/goals/goal-cap-stats';
import type { GoalPositionAuditView } from '@/lib/goals/goal-position-audit';

const stats: GoalCapStatsView = {
  sessionsDone: 2,
  durationSeconds: 8100,
  durationLabel: '2h15',
  loadTotal: 112,
  loadLabel: '112',
  hasLinkedSessions: true,
  avgDurationLabel: '1h07',
  weeksSpanned: 2,
  sessionsPerWeekLabel: '1 / sem.',
  sportShares: [
    {
      type: 'RUN',
      label: 'Course',
      sessions: 1,
      durationSeconds: 5400,
      durationLabel: '1h30',
      sessionSharePct: 50,
      durationSharePct: 67,
    },
  ],
};

const position: GoalPositionAuditView = {
  label: 'Position',
  value: '—',
  hint: 'vs Sub 5h00',
  tone: 'calm',
  kind: 'race',
  comparison: 'unavailable',
  targetLabel: 'Sub 5h00',
  projectedLabel: null,
  gapLabel: null,
  lead: 'Projection du temps estimé versus ta cible.',
  statusBody: 'Cible : Sub 5h00. Manque preuves nage, vélo ou course pour simuler.',
  whenLine: 'J-27 · jours restants',
  legs: [],
};

describe('buildCapStatDetail', () => {
  it('keeps sport shares and drops session history rows', () => {
    const detail = buildCapStatDetail({ kind: 'sessions', stats, position });
    expect(detail.sportShares).toHaveLength(1);
    expect(detail).not.toHaveProperty('rows');
  });

  it('builds a position comparison detail without sport mix', () => {
    const detail = buildCapStatDetail({ kind: 'position', stats, position });
    expect(detail.audit?.targetLabel).toBe('Sub 5h00');
    expect(detail.sportShareMode).toBeNull();
    expect(detail.lead).toMatch(/temps estimé versus/i);
  });
});
