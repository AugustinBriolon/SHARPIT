import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  coachMemoryTypeLabel,
  travelTrainingConstraintLabel,
  type CoachMemoryEntry,
} from '@/lib/coach-memory/types';
import { formatDayRange } from '@/lib/format';

/** French abbreviations that end in a dot without ending a sentence. */
const ABBREVIATIONS = new Set([
  'cf',
  'dr',
  'env',
  'etc',
  'ex',
  'm',
  'max',
  'min',
  'mme',
  'p',
  'réf',
  'st',
  'vs',
]);

function endsWithAbbreviation(text: string): boolean {
  const match = /(\p{L}+)\.$/u.exec(text.trimEnd());
  return match !== null && ABBREVIATIONS.has(match[1].toLowerCase());
}

/**
 * Splits a paragraph on sentence boundaries — a break only counts when the next
 * sentence actually starts (uppercase or an opening quote), so decimals and
 * “ex. mardi” stay intact. Fragments after a known abbreviation are re-joined.
 */
function splitIntoSentences(paragraph: string): string[] {
  const fragments = paragraph.split(/(?<=[.!?])\s+(?=[«"“(]?\p{Lu})/u);
  const sentences: string[] = [];

  for (const fragment of fragments) {
    const previous = sentences.at(-1);
    if (previous !== null && endsWithAbbreviation(previous)) {
      sentences[sentences.length - 1] = `${previous} ${fragment}`;
    } else {
      sentences.push(fragment);
    }
  }

  return sentences.map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 0);
}

/**
 * Splits the free-text durable context into its individual preferences.
 *
 * One preference per line is the intended shape, but the field is free text and
 * is often a single paragraph — that paragraph is then segmented into its own
 * sentences so the list and the counter reflect what is really stored. Items are
 * always the athlete's verbatim words; nothing is reworded or summarised.
 */
export function parseDurablePreferences(profileContext: string): string[] {
  const lines = profileContext
    .split('\n')
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter((line) => line.length > 0);

  if (lines.length !== 1) {
    return lines;
  }
  return splitIntoSentences(lines[0]);
}

/** A lone item reads better as a paragraph than as a one-bullet list. */
export function shouldRenderAsBullets(profileContext: string): boolean {
  return parseDurablePreferences(profileContext).length > 1;
}

function formatDay(isoDate: string): string {
  return format(parseISO(isoDate), 'd MMM', { locale: fr });
}

/** “Chamonix jusqu’au 12 août — outdoor seul” — every part read off the entry. */
function describeEntry(entry: CoachMemoryEntry): string {
  const name =
    entry.label?.trim() ||
    entry.locationLabel?.trim() ||
    coachMemoryTypeLabel(entry.type) ||
    'Contrainte';

  let text = `${name} jusqu'au ${formatDay(entry.endDate)}`;

  const constraint =
    entry.trainingConstraint !== 'FULL'
      ? travelTrainingConstraintLabel(entry.trainingConstraint)
      : null;
  if (constraint) {
    text += ` — ${constraint.toLowerCase()}`;
  }

  return text;
}

/**
 * Coach-voice recap of what is currently remembered.
 *
 * Strictly derived: it reports how many durable preferences exist and names the
 * active constraints from their own fields. It never paraphrases the free text
 * (that would invent meaning) and returns `null` when there is nothing to say.
 */
export function buildCoachMemorySummary({
  profileContext,
  entries,
}: {
  profileContext: string;
  entries: CoachMemoryEntry[];
}): string | null {
  const durableCount = parseDurablePreferences(profileContext).length;
  const active = entries.filter((entry) => entry.isActive);

  if (durableCount === 0 && active.length === 0) {
    return null;
  }

  const sentences: string[] = [];

  if (durableCount > 0) {
    sentences.push(
      durableCount > 1
        ? `Je garde en tête tes ${durableCount} préférences durables.`
        : 'Je garde en tête ta préférence durable.',
    );
  }

  if (active.length === 1) {
    sentences.push(`En ce moment, je tiens compte de ${describeEntry(active[0])}.`);
  } else if (active.length > 1) {
    sentences.push(
      `En ce moment, je tiens compte de ${active.length} contraintes, dont ${describeEntry(active[0])}.`,
    );
  }

  return sentences.join(' ');
}

/**
 * Date reading for an entry card.
 * A running window only needs its end (“jusqu'au 30 août 2026”); an upcoming one
 * reads as a range, collapsing the month when both ends share it.
 */
export function formatEntryDateRange(entry: CoachMemoryEntry): string {
  if (entry.isActive) {
    return `jusqu'au ${format(parseISO(entry.endDate), 'd MMM yyyy', { locale: fr })}`;
  }
  return formatDayRange(entry.startDate, entry.endDate);
}
