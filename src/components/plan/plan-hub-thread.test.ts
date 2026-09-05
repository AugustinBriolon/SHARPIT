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
    resolve(process.cwd(), 'src/components/plan/plan-week-entries.tsx'),
    'utf8',
  );
  const thread = readFileSync(
    resolve(process.cwd(), 'src/components/plan/plan-week-thread.tsx'),
    'utf8',
  );
  const decision = readFileSync(
    resolve(process.cwd(), 'src/components/plan/plan-week-decision.tsx'),
    'utf8',
  );
  const actions = readFileSync(
    resolve(process.cwd(), 'src/components/plan/plan-actions.tsx'),
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
    expect(widgets).toContain('space-y-4');
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
    expect(entries).not.toContain('HISTORY_CHIP');
    expect(entries).not.toContain('chip-surface');
    expect(entries).not.toContain('de plus dans l’historique');
    expect(entries).toContain('selectHubDoneEntries');
    expect(entries).toContain('selectHubRemainingEntries');
    expect(entries).toContain('text-section-title');
    expect(entries).toContain('HubDayCaption');
    expect(thread).not.toContain('border-l-2');
    expect(thread).not.toContain('PlanTrajectoryStrip');
    expect(thread).not.toContain('État du bloc');
    expect(thread).not.toContain('PlanLoadTrendSection');
    expect(thread).toContain('text-section-title');
    expect(thread).toContain('Projection');
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
    expect(decision).not.toContain('ACTION_CLASS');
    expect(decision).not.toContain('chip-surface');
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
});
