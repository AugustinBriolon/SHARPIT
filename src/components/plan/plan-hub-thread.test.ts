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
  const strip = readFileSync(
    resolve(process.cwd(), 'src/components/plan/plan-week-strip.tsx'),
    'utf8',
  );
  const decision = readFileSync(
    resolve(process.cwd(), 'src/components/plan/plan-week-decision.tsx'),
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
    expect(entries).toContain('w-[min(14rem,calc(100cqi-1.5rem))]');
    expect(entries).toContain('layout="stack"');
    expect(entries).toContain('groupHubDoneByDay');
    expect(entries).toContain('hubDoneCardAccessibleName');
    expect(entries).toContain('pe-6');
    expect(entries).toContain('selectHubDoneEntries');
    expect(entries).toContain('selectHubRemainingEntries');
    expect(thread).not.toContain('border-l-2');
    expect(thread).not.toContain('PlanTrajectoryStrip');
  });

  it('keeps the week decision typographic and the strip as one instrument', () => {
    expect(decision).not.toContain('analysis-panel-alt');
    expect(strip).toContain('analysis-panel');
    expect(strip).toContain('divide-x');
    expect(strip).toContain('grid-cols-7');
  });
});
