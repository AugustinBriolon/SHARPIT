import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('TodayJournalHabitBridgeStrip', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/components/today/rich/today-journal-habit-bridge-strip.tsx'),
    'utf8',
  );

  it('uses TodayInstrumentCard like sleep / regularity / nutrition', () => {
    expect(source).toContain('TodayInstrumentCard');
    expect(source).toContain('min-h-38');
    expect(source).not.toMatch(/className=.*analysis-panel|['"]analysis-panel/);
  });

  it('puts a hero metric on the running test, same scale as Régularité', () => {
    expect(source).toContain('text-[2.75rem]');
    expect(source).toContain('parseProgressLabel');
    expect(source).not.toContain('iconSide="start"');
  });

  it('titles the experiment as a category instrument (« Test »), not the habit name', () => {
    expect(source).toContain('callout.experiment.sourceLabel');
  });
});
