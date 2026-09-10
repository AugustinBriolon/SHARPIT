/**
 * Server side of the « Lecture coach · journal » Pro perk.
 * A conversation opened from Analyses journal carries `discussKind` in its user
 * message metadata; the discuss registry (`coach-discuss-server-context.ts`)
 * re-checks Pro before loading the findings.
 */

import type { PrismaClient } from '@prisma/client';
import { confidenceLabel } from '@/lib/health/journal-habit-finding-copy';
import { loadJournalHabitFindings } from '@/lib/health/journal-habit-analysis-load';
import {
  buildJournalHabitReading,
  type JournalHabitReading,
} from '@/lib/health/journal-habit-reading';
import { JOURNAL_ANALYSIS_MIN_DAYS, isJournalAnalysisReady } from '@/lib/health/journal-limits';

export const JOURNAL_ANALYSES_PRO_REQUIRED_ERROR =
  'La lecture coach du journal est réservée à Pro.';

const BLOCK_HEADER = '## Analyses journal (conversation ouverte depuis cette page)';

const BLOCK_GUARDRAILS =
  "Ce sont des associations observées sur les propres jours de l'athlète, pas des causes : n'affirme jamais qu'une habitude « cause » un effet. Priorise les associations nettes, puis propose 1 à 2 expériences concrètes sur 7 jours, un seul levier à la fois.";

function formatNotReadyBlock(daysWithSignal: number): string {
  return [
    BLOCK_HEADER,
    `Pas encore assez de données : ${daysWithSignal}/${JOURNAL_ANALYSIS_MIN_DAYS} jours avec signal. Dis-le honnêtement et n'invente aucune association.`,
  ].join('\n');
}

function formatEmptyBlock(reading: JournalHabitReading): string {
  return [
    BLOCK_HEADER,
    `${reading.summary}. Aucune association exploitable : les habitudes constantes (toujours / jamais) ne créent pas de contraste. N'invente aucune association.`,
    `Piste suggérée à l'athlète : ${reading.actionHint}`,
  ].join('\n');
}

function formatFindingLines(reading: JournalHabitReading): string[] {
  const lines: string[] = [];
  const { priority } = reading;
  if (priority) {
    lines.push(
      `Priorité : ${priority.title} (${confidenceLabel(priority.confidence)}). ${priority.detail}`,
    );
  }
  const others = reading.highlights.filter((item) => item.factorId !== priority?.factorId);
  if (others.length > 0) {
    lines.push('Autres associations :');
    lines.push(...others.map((item) => `- ${item.title} (${confidenceLabel(item.confidence)})`));
  }
  return lines;
}

export function formatJournalAnalysesCoachBlock(reading: JournalHabitReading): string {
  if (!isJournalAnalysisReady(reading.daysWithSignal)) {
    return formatNotReadyBlock(reading.daysWithSignal);
  }
  if (reading.empty) {
    return formatEmptyBlock(reading);
  }
  return [
    BLOCK_HEADER,
    BLOCK_GUARDRAILS,
    `Synthèse : ${reading.headline} (${reading.summary}).`,
    ...formatFindingLines(reading),
    `Piste suggérée à l'athlète : ${reading.actionHint}`,
  ].join('\n');
}

export async function loadJournalAnalysesCoachBlock(
  prisma: PrismaClient,
  athleteId: string,
): Promise<string> {
  const { daysWithSignal, findings } = await loadJournalHabitFindings(prisma, athleteId);
  return formatJournalAnalysesCoachBlock(buildJournalHabitReading(findings, daysWithSignal));
}
