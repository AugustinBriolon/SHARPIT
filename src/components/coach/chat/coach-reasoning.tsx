'use client';

/**
 * Thinking indicator — deliberately shows no reasoning text.
 *
 * The coach's reasoning summary used to stream sentence-by-sentence here.
 * Generating that summary cost real output tokens for content the athlete
 * mostly skipped past, so the backend stopped producing it (`includeThoughts`
 * in `src/lib/ai.ts`). This component now only signals "the coach is
 * thinking" — it never renders reasoning text even if a fallback provider
 * still emits some, so the cost stays cut regardless of which model serves
 * the request.
 */
export function CoachReasoning({
  streaming,
  hasAnswerText,
}: {
  text: string;
  streaming: boolean;
  hasAnswerText: boolean;
}) {
  if (!streaming || hasAnswerText) return null;

  return (
    <div className="flex items-center gap-1.5 py-1.5 text-xs">
      <span className="coach-orb shrink-0" aria-hidden />
      <span className="coach-thinking-shimmer font-medium">Le coach réfléchit…</span>
    </div>
  );
}
