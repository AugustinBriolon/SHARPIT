import type { ToolSet } from 'ai';
import { coachToolFailure } from './coach-tools-shared';

/**
 * How the coach's tools run within one answer.
 *
 * - **Writes one at a time.** Proposals the athlete approves together are executed together; two
 *   deletions touching the same brick then deadlocked in production. Reads stay concurrent.
 * - **No raw exception.** A tool that throws becomes `{ ok: false, error }`: the model reads why and
 *   can say so, and the athlete never sees a tool card with the stream's generic failure message.
 */

/** Runs the work it is given one after the other, in call order, whatever each one's outcome. */
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(work: () => Promise<T>): Promise<T> => {
    const run = tail.then(work, work);
    tail = run.catch(() => undefined);
    return run;
  };
}

type Execute = (input: unknown, options: unknown) => unknown;

/** Every tool wrapped: writes queued, thrown errors turned into failures the model can read. */
export function withCoachToolExecution<TOOLS extends ToolSet>(
  tools: TOOLS,
  writeToolNames: ReadonlySet<string>,
): TOOLS {
  const queue = createSerialQueue();
  const wrapped = Object.entries(tools).map(([name, tool]) => {
    const execute = tool.execute as Execute | undefined;
    if (!execute) {
      return [name, tool];
    }
    const guarded = async (input: unknown, options: unknown) => {
      try {
        return await execute(input, options);
      } catch (error) {
        console.error(`[coach] ${name}`, error);
        return coachToolFailure("L'action n'a pas abouti", error);
      }
    };
    const run = writeToolNames.has(name)
      ? (input: unknown, options: unknown) => queue(() => guarded(input, options))
      : guarded;
    return [name, { ...tool, execute: run }];
  });
  return Object.fromEntries(wrapped) as TOOLS;
}
