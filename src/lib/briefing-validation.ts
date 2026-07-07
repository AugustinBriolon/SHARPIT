import type { BriefingDayContext } from '@/lib/briefing-context';
import type { CoachContext } from '@/lib/coach-context';

const SPORT_PATTERNS: Array<{ key: string; patterns: RegExp[] }> = [
  { key: 'BIKE', patterns: [/\bvélo\b/i, /\bvelo\b/i, /\bcycl/i] },
  { key: 'SWIM', patterns: [/\bnatation\b/i, /\bpiscine\b/i, /\bnager\b/i] },
  { key: 'RUN', patterns: [/\bcourse\b/i, /\bcourir\b/i, /\brunning\b/i] },
  { key: 'STRENGTH', patterns: [/\brenfo\b/i, /\bmusculation\b/i] },
];

function sportsInLines(lines: string[]): Set<string> {
  const found = new Set<string>();
  const blob = lines.join('\n').toLowerCase();
  for (const { key, patterns } of SPORT_PATTERNS) {
    if (patterns.some((p) => p.test(blob))) found.add(key);
  }
  return found;
}

function sportsMentionedInText(text: string): Set<string> {
  const found = new Set<string>();
  for (const { key, patterns } of SPORT_PATTERNS) {
    if (patterns.some((p) => p.test(text))) found.add(key);
  }
  return found;
}

function extractAllowedRaceTitles(ctx: CoachContext): string[] {
  return ctx.races.map((r) => r.title.toLowerCase()).filter(Boolean);
}

function mentionsUnknownRace(text: string, allowed: string[]): boolean {
  if (allowed.length === 0) return false;
  const lower = text.toLowerCase();
  const raceMention = /\b(course|marathon|ironman|semi|10\s?km|objectif|race)\b/i.test(lower);
  if (!raceMention) return false;
  return !allowed.some((title) => title.length > 3 && lower.includes(title));
}

/**
 * Strict post-generation validation — briefing must not invent facts.
 */
export function validateBriefingContent(
  content: string,
  dayCtx: BriefingDayContext,
  coachCtx: CoachContext,
): { valid: true } | { valid: false; reason: string } {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length < 40) {
    return { valid: false, reason: 'contenu trop court' };
  }

  const todaySports = sportsInLines(dayCtx.sessionsDoneToday);
  const yesterdaySports = sportsInLines(dayCtx.sessionsYesterday);
  const plannedSports = sportsInLines(dayCtx.sessionsStillPlannedToday);
  const allowedSports = new Set([...todaySports, ...yesterdaySports, ...plannedSports]);
  const mentionedSports = sportsMentionedInText(trimmed);

  for (const sport of mentionedSports) {
    if (!allowedSports.has(sport)) {
      return { valid: false, reason: `séance inventée (${sport})` };
    }
  }

  const attributesToday =
    /\baujourd'?hui\b/i.test(trimmed) ||
    /\bce (matin|midi|soir)\b/i.test(trimmed) ||
    /\bce jour\b/i.test(trimmed);

  if (attributesToday) {
    for (const sport of mentionedSports) {
      if (yesterdaySports.has(sport) && !todaySports.has(sport) && !plannedSports.has(sport)) {
        return {
          valid: false,
          reason: `séance d'hier présentée comme aujourd'hui (${sport})`,
        };
      }
    }
  }

  if (dayCtx.sessionsDoneToday.length === 0 && /\b(déjà|terminé|réalisé|fait)\b/i.test(trimmed)) {
    const impliesDoneToday = [...mentionedSports].some((s) => !plannedSports.has(s));
    if (impliesDoneToday && todaySports.size === 0) {
      return { valid: false, reason: 'séance réalisée inventée pour aujourd’hui' };
    }
  }

  const allowedRaces = extractAllowedRaceTitles(coachCtx);
  if (mentionsUnknownRace(trimmed, allowedRaces) && allowedRaces.length > 0) {
    return { valid: false, reason: 'course ou objectif non présent dans le contexte' };
  }

  const readiness = coachCtx.health.readinessToday;
  if (readiness != null) {
    const cited = trimmed.match(/\b(\d{2,3})\s*\/\s*100\b/g);
    if (cited) {
      const values = cited.map((m) => Number.parseInt(m, 10));
      const plausible = values.some((v) => Math.abs(v - readiness) <= 8);
      if (!plausible && values.some((v) => v >= 40 && v <= 100)) {
        return { valid: false, reason: 'readiness citée incompatible avec les données' };
      }
    }
  }

  return { valid: true };
}

export function buildDeterministicBriefingFallback(
  dayCtx: BriefingDayContext,
  coachCtx: CoachContext,
): string {
  const lines: string[] = [];
  const readiness = coachCtx.health.readinessToday;
  const { tsb } = coachCtx.fitness;

  if (readiness != null) {
    lines.push(
      `Ta readiness est à ${readiness}/100${tsb != null ? `, avec une fraîcheur (TSB) à ${tsb > 0 ? '+' : ''}${tsb}` : ''}.`,
    );
  } else if (tsb != null) {
    lines.push(`Ta fraîcheur (TSB) est à ${tsb > 0 ? '+' : ''}${tsb} aujourd'hui.`);
  } else {
    lines.push(
      "SHARPIT n'a pas encore assez de signaux pour un bilan personnalisé complet aujourd'hui.",
    );
  }

  if (dayCtx.sessionsDoneToday.length > 0) {
    lines.push(
      `Séance${dayCtx.sessionsDoneToday.length > 1 ? 's' : ''} déjà réalisée${dayCtx.sessionsDoneToday.length > 1 ? 's' : ''} aujourd'hui — consulte le détail dans ton journal.`,
    );
  } else if (dayCtx.sessionsStillPlannedToday.length > 0) {
    lines.push('Une séance est prévue aujourd’hui — adapte l’intensité à ta forme du moment.');
  } else {
    lines.push('Aucune séance planifiée pour le reste de la journée.');
  }

  if (coachCtx.physical.length > 0) {
    const [note] = coachCtx.physical;
    lines.push(
      `Point de vigilance : ${note.title}${note.severity != null ? ` (sévérité ${note.severity}/10)` : ''} — respecte cette contrainte.`,
    );
  }

  lines.push(
    'Ce message est généré à partir de tes données mesurées, sans interprétation supplémentaire.',
  );

  return lines.join('\n\n');
}
