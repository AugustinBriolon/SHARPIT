import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Plan hub continuous thread', () => {
  const hub = readFileSync(resolve(process.cwd(), 'src/components/shell/plan-hub.tsx'), 'utf8');
  const widgets = readFileSync(
    resolve(process.cwd(), 'src/components/shell/plan-hub-widgets.tsx'),
    'utf8',
  );
  const entries = readFileSync(
    resolve(process.cwd(), 'src/components/plan/week/plan-week-entries.tsx'),
    'utf8',
  );
  const thread = readFileSync(
    resolve(process.cwd(), 'src/components/plan/week/plan-week-thread.tsx'),
    'utf8',
  );
  const decision = readFileSync(
    resolve(process.cwd(), 'src/components/plan/week/plan-week-decision.tsx'),
    'utf8',
  );
  const actions = readFileSync(
    resolve(process.cwd(), 'src/components/plan/hub/plan-actions.tsx'),
    'utf8',
  );

  it('keeps the first-viewport title and drops the inventory subtitle', () => {
    expect(hub).toContain('Ton cap, cette semaine');
    expect(hub).not.toContain('Où tu en es');
    expect(hub).not.toContain('Ton objectif, la phase du plan');
  });

  it('composes destination, decision, and thread in one column', () => {
    expect(widgets).toContain('PlanDestinationPlate');
    expect(widgets).toContain('PlanWeekDecision');
    expect(widgets).toContain('PlanWeekThread');
    expect(widgets).toContain('space-y-8');
    expect(widgets).toContain('excludePlannedId');
    expect(widgets).not.toContain('PlanWeekSection');
    expect(widgets).not.toContain('PlanGoalBand');
    expect(widgets).not.toContain('PlanPhaseBand');
    expect(widgets).not.toContain('PlanBriefCard');
    expect(widgets).not.toContain('grid-cols-2');
  });

  it('rails completed previews and caps remaining on the hub', () => {
    expect(entries).toContain('snap-x snap-mandatory');
    expect(entries).toContain('min-w-[min(14rem,100cqi)]');
    expect(entries).not.toContain('pe-6');
    expect(entries).not.toContain('hubDoneRailOverflows');
    expect(entries).toContain('layout="stack"');
    expect(entries).toContain('groupHubDoneByDay');
    expect(entries).toContain('hubDoneCardAccessibleName');
    expect(entries).toContain('Historique');
    expect(entries).toContain('LinkButton');
    expect(entries).toContain('variant="outline"');
    expect(entries).toContain('size="sm"');
    expect(entries).toContain('PlanSectionHeading');
    expect(entries).not.toContain('HISTORY_CHIP');
    expect(entries).not.toContain('chip-surface');
    expect(entries).not.toContain('de plus dans l’historique');
    expect(entries).toContain('selectHubDoneEntries');
    expect(entries).toContain('selectHubRemainingEntries');
    expect(entries).toContain('HubDayCaption');
    expect(thread).not.toContain('border-l-2');
    expect(thread).not.toContain('PlanTrajectoryStrip');
    expect(thread).not.toContain('État du bloc');
    expect(thread).not.toContain('PlanLoadTrendSection');
    expect(thread).toContain('PlanSectionHeading');
    expect(thread).toContain('Projection');
    expect(thread).toContain('Voir le bilan');
    expect(thread).toContain('/plan/bilan');
    expect(thread).toContain('LinkButton');
    expect(thread).toContain('ClipboardList');
    expect(
      readFileSync(
        resolve(process.cwd(), 'src/components/plan/hub/plan-projection-section.tsx'),
        'utf8',
      ),
    ).not.toContain('href="/plan/bilan"');
  });

  it('opens the next session as a compact instrument card without a week digest', () => {
    expect(decision).toContain('density="compact"');
    expect(decision).toContain('buildPlannedSessionPreview');
    expect(decision).toContain('equipment={preview.equipment}');
    expect(decision).not.toContain('density="stack"');
    expect(decision).not.toContain('PlanWeekDigest');
    expect(decision).not.toContain('athleteVisibleCopy');
    expect(decision).not.toContain('PlanWeekStrip');
    expect(decision).toContain('LinkButton');
    expect(decision).toContain("from '@/components/ui/button'");
    expect(decision).toContain('variant="outline"');
    expect(decision).toContain('size="sm"');
    expect(decision).toContain('decision.secondary');
    expect(decision).toContain('headingAction');
    expect(decision).toContain('CalendarDays');
    expect(decision).toContain('PlanSectionHeading');
    expect(decision).not.toContain('ACTION_CLASS');
    expect(decision).not.toContain('chip-surface');
  });

  it('aligns hub section actions with the title row', () => {
    const heading = readFileSync(
      resolve(process.cwd(), 'src/components/plan/hub/plan-section-heading.tsx'),
      'utf8',
    );
    expect(heading).toContain('justify-between');
    expect(heading).toContain('text-section-title');
  });

  it('keeps the active macro phase readable on the inverted ink band', () => {
    const plate = readFileSync(
      resolve(process.cwd(), 'src/components/plan/hub/plan-destination-plate.tsx'),
      'utf8',
    );
    expect(plate).toContain('dark:border-ink-surface-foreground');
    expect(plate).toContain('dark:text-ink-surface-foreground');
    expect(plate).not.toContain('text-highlight mt-2');
  });

  it('reuses the shared outline sm button on hub actions', () => {
    expect(actions).toContain('DiscussWithCoachButton');
    expect(actions).toContain('label="Coach"');
    expect(actions).not.toContain('Demander au Coach');
    expect(actions).toContain('LinkButton');
    expect(actions).toContain('variant="outline"');
    expect(actions).toContain('size="sm"');
    expect(actions).not.toContain('chip-surface');
    expect(actions).not.toContain('const CHIP');
  });

  it('keeps realized map cards cached across Plan visits', () => {
    const model = readFileSync(resolve(process.cwd(), 'src/hooks/use-plan-hub-model.ts'), 'utf8');
    const prefetch = readFileSync(resolve(process.cwd(), 'src/hooks/use-prefetch-nav.ts'), 'utf8');
    const map = readFileSync(
      resolve(process.cwd(), 'src/components/training/activity/insights/route-map.tsx'),
      'utf8',
    );
    expect(model).toContain('readPlanHubNow');
    expect(model).toContain('useWarmPlanHubStreams');
    expect(prefetch).toContain('selectPlanHubStreamPrefetchIds');
    expect(prefetch).toContain('activityStream');
    expect(map).toContain('shouldDeferRouteMapMount');
    expect(
      readFileSync(
        resolve(process.cwd(), 'src/components/today/rich/completed-session-preview.tsx'),
        'utf8',
      ),
    ).toContain('readRememberedHubRoute');
    expect(
      readFileSync(resolve(process.cwd(), 'src/components/shell/plan-hub-widgets.tsx'), 'utf8'),
    ).toContain('retained.current');
  });
});
