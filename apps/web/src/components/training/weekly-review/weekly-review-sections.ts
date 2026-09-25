export type WeeklyReviewSection = {
  heading: string;
  /** Includes its own `## Heading` line — fed to <Markdown> as-is. */
  body: string;
};

/**
 * Splits the generated markdown on its `## ` boundaries. The system prompt
 * (WEEKLY_SYSTEM in weekly-review.ts) enforces exactly four headings — this
 * degrades gracefully if the model drifts: an unmatched section just renders
 * with no illustration attached, it never breaks.
 */
export function splitWeeklyReviewSections(content: string): WeeklyReviewSection[] {
  const chunks = content.split(/\n(?=##\s)/).filter((chunk) => chunk.trim().length > 0);
  return chunks.map((body) => {
    const match = /^##\s+(.+)/.exec(body.trim());
    return { heading: match ? match[1].trim() : '', body };
  });
}

export type WeeklyReviewIllustrationKind = 'training' | 'sleep';

/** Which illustration (if any) belongs next to a given section heading. */
export function matchIllustrationKind(heading: string): WeeklyReviewIllustrationKind | null {
  const normalized = heading.toLowerCase();
  if (normalized.includes('bilan')) {
    return 'training';
  }
  if (normalized.includes('sommeil')) {
    return 'sleep';
  }
  return null;
}
