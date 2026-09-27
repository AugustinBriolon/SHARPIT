/**
 * Where a coach answer spends its time, one phase at a time, logged once per answer. Durations,
 * sizes and counts only — never a message, a prompt or anything about the athlete.
 */
export type CoachChatTiming = {
  mark: (phase: string) => void;
  note: (key: string, value: number) => void;
  /** The first visible character of the answer, once. */
  firstText: () => void;
  summary: () => Record<string, number>;
};

export function startCoachChatTiming(now: () => number = () => performance.now()): CoachChatTiming {
  const start = now();
  let last = start;
  const values: Record<string, number> = {};
  return {
    mark(phase) {
      const at = now();
      values[`${phase}Ms`] = Math.round(at - last);
      last = at;
    },
    note(key, value) {
      values[key] = value;
    },
    firstText() {
      if (values.firstTextMs === undefined) {
        values.firstTextMs = Math.round(now() - start);
      }
    },
    summary() {
      return { ...values, totalMs: Math.round(now() - start) };
    },
  };
}
