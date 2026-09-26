import { describe, expect, it } from 'vitest';

describe('journal screen', () => {
  it('places the Recovery callout only at Journal header (before Analyses toolbar)', async () => {
    const { readFile } = await import('node:fs/promises');
    const screen = await readFile(
      new URL('../components/journal/journal-screen.tsx', import.meta.url),
      'utf8',
    );
    const calloutAt = screen.indexOf('<JournalRecoveryCallout');
    const toolbarAt = screen.indexOf('<JournalScreenToolbar');
    expect(calloutAt).toBeGreaterThan(-1);
    expect(toolbarAt).toBeGreaterThan(-1);
    expect(calloutAt).toBeLessThan(toolbarAt);
    expect(screen.match(/<JournalRecoveryCallout/g)).toHaveLength(1);
  });
});
