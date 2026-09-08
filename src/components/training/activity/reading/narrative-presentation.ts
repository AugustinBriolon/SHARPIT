import type { DisplayMode } from '@/lib/preferences/display-mode';

function normalizeWords(value: string): string[] {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4);
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Prefer the clause after `:` when the lead-in overlaps the activity title. */
function stripOverlappingLeadIn(trimmed: string, titleWords: Set<string>): string | null {
  const colonIndex = trimmed.indexOf(':');
  if (colonIndex <= 0 || colonIndex >= trimmed.length - 1) {
    return null;
  }
  const leadIn = trimmed.slice(0, colonIndex).trim();
  const after = trimmed.slice(colonIndex + 1).trim();
  const overlap = normalizeWords(leadIn).filter((word) => titleWords.has(word)).length;
  if (overlap < 2 || after.length < 12) {
    return null;
  }
  return capitalizeFirst(after);
}

/**
 * Drop a leading title echo from the coach headline.
 * Prefers the clause after `:` when the lead-in overlaps the activity title
 * (e.g. title "… Sortie Longue …" + "Sortie longue maîtrisée : endurance…").
 */
export function dedupeHeadlineAgainstTitle(
  headline: string,
  title: string | null | undefined,
): string {
  const trimmed = headline.trim();
  if (!title?.trim() || !trimmed) {
    return trimmed;
  }

  const titleWords = new Set(normalizeWords(title));
  if (titleWords.size === 0) {
    return trimmed;
  }

  return stripOverlappingLeadIn(trimmed, titleWords) ?? trimmed;
}

const EXPERT_TERM_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bACWR\b/g, 'charge relative'],
  [/\bTSB\b/g, 'indice de forme'],
  [/\bCTL\b/g, 'forme chronique'],
  [/\bATL\b/g, 'fatigue récente'],
  [/\bLTHR\b/g, 'seuil cardio'],
  [/\bFTP\b/g, 'seuil puissance'],
  [/\bHRV\b/g, 'variabilité cardiaque'],
  [/\bPMC\b/g, 'courbe de forme'],
];

/** Soften expert acronyms for the essential reading. Expert keeps the source text. */
export function presentNarrativeBody(text: string, mode: DisplayMode): string {
  if (mode === 'expert' || !text) {
    return text;
  }
  return EXPERT_TERM_REPLACEMENTS.reduce(
    (body, [pattern, plain]) => body.replace(pattern, plain),
    text,
  );
}
