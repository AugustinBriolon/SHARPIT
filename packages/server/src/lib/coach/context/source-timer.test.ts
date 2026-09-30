import { describe, expect, it } from 'vitest';
import { createSourceTimer } from '@sharpit/server/lib/coach/context/source-timer';

describe('createSourceTimer', () => {
  it('records each read from its start to its own end', async () => {
    let clock = 0;
    const timer = createSourceTimer(() => clock);
    let finishSnapshot: (value: string) => void = () => undefined;
    const snapshot = timer.time(
      'snapshot',
      new Promise<string>((resolve) => {
        finishSnapshot = resolve;
      }),
    );
    const goals = timer.time('goals', Promise.resolve(['race']));

    clock = 40;
    expect(await goals).toEqual(['race']);
    clock = 900;
    finishSnapshot('built');
    expect(await snapshot).toBe('built');

    expect(timer.durations()).toEqual({ goals: 40, snapshot: 900 });
  });

  it('leaves a failed read out and lets its error through', async () => {
    const timer = createSourceTimer(() => 0);
    await expect(timer.time('weather', Promise.reject(new Error('down')))).rejects.toThrow('down');
    expect(timer.durations()).toEqual({});
  });
});
