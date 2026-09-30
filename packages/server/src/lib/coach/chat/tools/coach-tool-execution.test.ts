import { describe, expect, it, vi } from 'vitest';
import { createSerialQueue, withCoachToolExecution } from './coach-tool-execution';

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('createSerialQueue', () => {
  it('starts each work only when the previous one has ended, even if it failed', async () => {
    const queue = createSerialQueue();
    const events: string[] = [];
    const first = deferred();

    const a = queue(async () => {
      events.push('a:start');
      await first.promise;
      events.push('a:end');
      throw new Error('deadlock');
    });
    const b = queue(async () => {
      events.push('b:start');
      return 'b';
    });

    await Promise.resolve();
    expect(events).toEqual(['a:start']);
    first.resolve();
    await expect(a).rejects.toThrow('deadlock');
    expect(await b).toBe('b');
    expect(events).toEqual(['a:start', 'a:end', 'b:start']);
  });
});

describe('withCoachToolExecution', () => {
  it('runs writes one at a time and reads alongside them', async () => {
    const events: string[] = [];
    const gate = deferred();
    const tools = withCoachToolExecution(
      {
        deletePlannedSession: {
          execute: async (input: { id: string }) => {
            events.push(`delete ${input.id}:start`);
            if (input.id === 'a') {
              await gate.promise;
            }
            events.push(`delete ${input.id}:end`);
            return { ok: true };
          },
        },
        listPlannedSessions: {
          execute: async () => {
            events.push('list');
            return { sessions: [] };
          },
        },
      } as never,
      new Set(['deletePlannedSession']),
    ) as unknown as Record<
      string,
      { execute: (input: unknown, options: unknown) => Promise<unknown> }
    >;

    const first = tools.deletePlannedSession!.execute({ id: 'a' }, {});
    const second = tools.deletePlannedSession!.execute({ id: 'b' }, {});
    await tools.listPlannedSessions!.execute({}, {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    // The read ran while the first write was still pending; the second write has not started.
    expect(events).toEqual(expect.arrayContaining(['list', 'delete a:start']));
    expect(events).not.toContain('delete b:start');

    gate.resolve();
    await Promise.all([first, second]);
    const writes = events.filter((event) => event.startsWith('delete'));
    expect(writes).toEqual(['delete a:start', 'delete a:end', 'delete b:start', 'delete b:end']);
  });

  it('turns a thrown error into a failure the model can read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const tools = withCoachToolExecution(
      {
        deletePlannedSession: {
          execute: async () => {
            throw new Error('Transaction failed due to a deadlock');
          },
        },
      } as never,
      new Set(['deletePlannedSession']),
    ) as unknown as Record<
      string,
      { execute: (input: unknown, options: unknown) => Promise<unknown> }
    >;

    expect(await tools.deletePlannedSession!.execute({ id: 'a' }, {})).toEqual({
      ok: false,
      error: "L'action n'a pas abouti : Transaction failed due to a deadlock",
    });
    error.mockRestore();
  });

  it('keeps a tool without execute as it is', () => {
    const approvalOnly = { description: 'x' };
    const tools = withCoachToolExecution({ approvalOnly } as never, new Set()) as unknown as Record<
      string,
      unknown
    >;
    expect(tools.approvalOnly).toBe(approvalOnly);
  });
});
