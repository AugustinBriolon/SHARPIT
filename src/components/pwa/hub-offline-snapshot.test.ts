import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProgressHub } from '@/components/progress/progress-hub';
import { TrainingThreadView } from '@/components/training/thread/training-thread-view';
import type { PersistedSnapshotEntry } from '@/lib/pwa/snapshot-store-validation';

const OFFLINE_BANNER = 'Lecture seule — hors ligne, données non synchronisables';

function mockOfflineEntry(): PersistedSnapshotEntry {
  return {
    schemaVersion: 1,
    ownerKey: 'user_1',
    snapshot: {
      snapshotId: 'snap-1',
      generatedAt: '2026-07-15T12:00:00.000Z',
      todaysDecision: 'TRAIN',
      confidenceLabel: 'Confiance modérée',
    } as never,
    generatedAt: '2026-07-15T12:00:00.000Z',
    freshnessComputedAt: '2026-07-15T12:00:00.000Z',
    cachedAt: '2026-07-15T12:00:00.000Z',
  };
}

vi.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: vi.fn(),
}));

vi.mock('@/hooks/use-offline-snapshot', () => ({
  useOfflineSnapshot: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('tab=composition'),
}));

vi.mock('@/hooks/use-presentation-view-model', () => ({
  useBodyPresentationViewModel: vi.fn(),
  usePhysicalHealthViewModel: vi.fn(),
}));

vi.mock('@/hooks/use-today-selected-date', () => ({
  useTodaySelectedDate: () => ({ date: new Date('2026-07-15T12:00:00.000Z') }),
}));

vi.mock('@/components/corps/composition/composition-view', () => ({
  CompositionView: () => createElement('div', null, 'composition-live'),
}));

vi.mock('@/components/physical-health/physical-health-hub-view', () => ({
  PhysicalHealthHubView: () => createElement('div', null, 'suivi-live'),
}));

vi.mock('@/hooks/use-data', () => ({
  useActivities: vi.fn(),
  usePlannedSessions: vi.fn(),
  useGoals: vi.fn(),
  useAthleteProfile: () => ({ data: undefined }),
  useRecords: () => ({ data: undefined }),
  useThresholdHistory: () => ({ data: undefined }),
}));

/* The thread reads these too, and hooks cannot be conditional — they run before
   the offline short-circuit even when there is nothing to render. */
vi.mock('@/hooks/use-coach-memory', () => ({
  useCoachMemory: () => ({ data: undefined }),
}));

vi.mock('@/hooks/use-planned-session-actions', () => ({
  usePlannedSessionActions: () => ({
    shift: vi.fn(),
    ease: vi.fn(),
    moveTo: vi.fn(),
    pending: false,
  }),
}));

vi.mock('@/hooks/use-viewport', () => ({
  useIsMobile: () => false,
}));

import { useOnlineStatus } from '@/hooks/use-online-status';
import { useOfflineSnapshot } from '@/hooks/use-offline-snapshot';
import {
  useBodyPresentationViewModel,
  usePhysicalHealthViewModel,
} from '@/hooks/use-presentation-view-model';
import { useActivities, useGoals, usePlannedSessions } from '@/hooks/use-data';

describe('hub offline snapshot contracts', () => {
  const progressSource = readFileSync(
    resolve(process.cwd(), 'src/components/progress/progress-hub.tsx'),
    'utf8',
  );
  const progressOfflineSource = readFileSync(
    resolve(process.cwd(), 'src/components/progress/use-progress-hub-offline.ts'),
    'utf8',
  );
  const progressContentSource = readFileSync(
    resolve(process.cwd(), 'src/components/progress/progress-hub-content.tsx'),
    'utf8',
  );
  const trainingSource = readFileSync(
    resolve(process.cwd(), 'src/components/training/thread/training-thread-view.tsx'),
    'utf8',
  );
  const coachSelectionSource = readFileSync(
    resolve(process.cwd(), 'src/components/coach/use-coach-conversation-selection.ts'),
    'utf8',
  );
  const coachLayoutSource = readFileSync(
    resolve(process.cwd(), 'src/components/coach/coach-view-layout.tsx'),
    'utf8',
  );
  const todaySource = readFileSync(
    resolve(process.cwd(), 'src/components/today/today-dashboard.tsx'),
    'utf8',
  );

  it('ProgressHub keeps chrome and gates the snapshot on cold data across sections', () => {
    expect(progressSource).toContain('StickyHeader');
    expect(progressOfflineSource).toContain('!isSet(goalsQuery.data)');
    expect(progressOfflineSource).toContain('useOfflineSnapshot(!online && hasNoLiveContent)');
    expect(progressContentSource).toContain('<OfflineSnapshotSummary entry={offlineEntry} />');
  });

  it('TrainingThreadView short-circuits the skeletons when offline and all queries cold', () => {
    expect(trainingSource).toContain('useOfflineSnapshot(!online && hasNoLiveData)');
    expect(trainingSource).toMatch(
      /if\s*\(\s*!online\s*&&\s*hasNoLiveData\s*&&\s*offlineEntry\s*\)/,
    );
  });

  it('CoachView shows snapshot in main panel when offline without live threads', () => {
    expect(coachSelectionSource).toContain('!isSet(conversationsQuery.data)');
    expect(coachSelectionSource).toContain('useOfflineSnapshot(!online && hasNoLiveContent)');
    expect(coachLayoutSource).toContain('<CoachPageHeader />');
  });

  it('TodayDashboard offline path is unchanged', () => {
    const todayViewsSource = readFileSync(
      resolve(process.cwd(), 'src/components/today/today-dashboard-views.tsx'),
      'utf8',
    );
    expect(todaySource).toContain('useOfflineSnapshot(!online && hasNoLiveContent)');
    expect(todayViewsSource).toContain('<OfflineSnapshotSummary entry={entry} />');
  });
});

describe('ProgressHub offline snapshot render', () => {
  beforeEach(() => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);
    vi.mocked(useOfflineSnapshot).mockReturnValue({ entry: mockOfflineEntry(), loading: false });
    vi.mocked(useBodyPresentationViewModel).mockReturnValue({
      data: undefined,
      isPending: true,
      isPlaceholderData: false,
    } as never);
    vi.mocked(useGoals).mockReturnValue({ data: undefined, isPending: true } as never);
    vi.mocked(usePhysicalHealthViewModel).mockReturnValue({
      data: undefined,
      isPending: true,
      isPlaceholderData: false,
    } as never);
  });

  it('renders the snapshot on the default section, not only under Corps & santé', () => {
    const html = renderToStaticMarkup(createElement(ProgressHub));

    expect(html).toContain('Progression');
    expect(html).toContain('Objectifs');
    expect(html).toContain('Corps &amp; santé');
    expect(html).toContain(OFFLINE_BANNER);
    expect(html).not.toContain('composition-live');
  });
});

describe('TrainingThreadView offline snapshot render', () => {
  beforeEach(() => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);
    vi.mocked(useOfflineSnapshot).mockReturnValue({ entry: mockOfflineEntry(), loading: false });
    vi.mocked(useActivities).mockReturnValue({ data: undefined, isPending: true } as never);
    vi.mocked(usePlannedSessions).mockReturnValue({ data: undefined, isPending: true } as never);
    vi.mocked(useGoals).mockReturnValue({ data: undefined, isPending: true } as never);
  });

  it('renders snapshot instead of the loading shell when offline and cold', () => {
    const html = renderToStaticMarkup(createElement(TrainingThreadView));

    expect(html).toContain(OFFLINE_BANNER);
    expect(html).not.toContain('Réglette de charge');
  });
});
