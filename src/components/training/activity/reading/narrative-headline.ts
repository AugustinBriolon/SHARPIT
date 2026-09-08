import type { ActivityNarrative } from '@/lib/validators/coach';

/** Extract coach headline from stored narrative JSON without throwing. */
export function readNarrativeHeadline(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const { headline } = raw as Partial<ActivityNarrative>;
  return typeof headline === 'string' && headline.trim().length > 0 ? headline.trim() : null;
}
