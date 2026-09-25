/**
 * Send only what the athlete actually changed.
 *
 * The profile form used to submit every field it owns, `null` for each empty one.
 * That is fine when the form is showing the truth, and destructive when it is
 * not: a load that failed renders empty fields, and editing one of them then
 * writes `null` over the others. Four fields on this profile were wiped exactly
 * that way.
 *
 * A diff against the baseline makes the whole class of bug impossible — a field
 * nobody touched is never in the payload, so it can never be cleared by
 * accident. Clearing a field deliberately still works, because that is a change
 * from its baseline and lands as an explicit `null`.
 */
export function changedProfileFields<T extends Record<string, unknown>>(
  baseline: T,
  next: T,
): Partial<T> {
  const patch: Partial<T> = {};
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (!Object.is(baseline[key], next[key])) {
      patch[key] = next[key];
    }
  }
  return patch;
}
