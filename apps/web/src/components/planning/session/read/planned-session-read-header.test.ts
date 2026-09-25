import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActivityType } from '@prisma/client';

import { PlannedSessionReadHeader } from './planned-session-read-header';
import type { ClientPlannedSession } from '@/lib/query/types';

vi.mock('@/hooks/use-offline-guard', () => ({
  useOfflineGuard: () => ({ offline: false, offlineLabel: 'Hors ligne', guardDisabled: false }),
  guardedActionLabel: (_offline: boolean, _label: string, action: string) => action,
}));

vi.mock('@/components/planning/session/planned-session-nav-dismiss', () => ({
  usePlannedSessionNavDismiss: () => null,
}));

vi.mock('@/providers/app-modal-provider', () => ({
  useAppModalOptional: () => null,
}));

function sessionFixture(): ClientPlannedSession {
  return {
    id: 'ps-1',
    type: ActivityType.RUN,
    title: 'Tempo',
    date: new Date('2026-07-20'),
    activityId: 'act-1',
  } as ClientPlannedSession;
}

describe('PlannedSessionReadHeader', () => {
  it('realized header keeps actions only — no repeated title/date/activity', () => {
    const html = renderToStaticMarkup(
      createElement(PlannedSessionReadHeader, {
        session: sessionFixture(),
        isRealized: true,
        dateLabel: '20 juil. 2026',
        actions: {
          onEdit: () => undefined,
          sessionId: 'ps-1',
          activityId: 'act-1',
          onReanalyze: () => undefined,
          hasAnalysis: true,
        },
      }),
    );

    expect(html).toContain('Actions de la séance');
    expect(html).not.toContain('Tempo');
    expect(html).not.toContain('20 juil. 2026');
    expect(html).not.toContain('Réalisée');
    expect(html).not.toContain('Programmée');
  });

  it('planned header still shows title and schedule meta', () => {
    const html = renderToStaticMarkup(
      createElement(PlannedSessionReadHeader, {
        session: sessionFixture(),
        isRealized: false,
        dateLabel: '20 juil. 2026',
        intentLine: '45 min · Endurance',
        actions: {
          onEdit: () => undefined,
          sessionId: 'ps-1',
        },
      }),
    );

    expect(html).toContain('Tempo');
    expect(html).toContain('Programmée');
    expect(html).toContain('20 juil. 2026');
    expect(html).toContain('45 min · Endurance');
    expect(html).toContain('Actions de la séance');
  });
});
