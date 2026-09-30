/**
 * How long each read of a parallel load took. The coach context runs fourteen reads at once and
 * only its total was logged: this names the slow one. Durations only.
 */
export function createSourceTimer(now: () => number = () => performance.now()) {
  const durations: Record<string, number> = {};
  return {
    time<T>(name: string, work: Promise<T>): Promise<T> {
      const startedAt = now();
      return work.then((value) => {
        durations[name] = Math.round(now() - startedAt);
        return value;
      });
    },
    durations: (): Record<string, number> => ({ ...durations }),
  };
}
