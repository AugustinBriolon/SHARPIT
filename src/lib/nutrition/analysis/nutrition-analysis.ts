import { format } from 'date-fns';
import { generateText, Output } from 'ai';
import type { NutritionCoachReadingView } from '@/core/presentation/nutrition-view-model';
import { COACH_MODEL, coachAnalysisGatewayOptions, isCoachConfigured } from '@/lib/ai';
import { recordAiUsage } from '@/lib/ai-usage';
import { sanitizeCoachCopy } from '@/lib/coach/sanitize-coach-copy';
import { isDemoSession } from '@/lib/demo/demo-session';
import { athleteHasAiProcessingConsent } from '@/lib/privacy/consent-store';
import {
  buildNutritionAnalysisFacts,
  type NutritionAnalysisFacts,
} from './nutrition-analysis-facts';
import { nutritionAnalysisInputHash } from './nutrition-analysis-hash';
import { loadNutritionAnalysisInput } from './nutrition-analysis-inputs';
import {
  NUTRITION_ANALYSIS_SYSTEM,
  formatNutritionAnalysisPrompt,
} from './nutrition-analysis-prompt';
import { nutritionDayReadingSchema, type NutritionDayReading } from './nutrition-analysis-schema';
import { decideNutritionReading } from './nutrition-analysis-state';
import {
  claimNutritionAnalysis,
  findNutritionAnalysisRow,
  saveNutritionAnalysis,
} from './nutrition-analysis-store';

/** Demo sessions are read-only and must not spend AI budget. */
async function canGenerateNutritionAnalysis(athleteId: string): Promise<boolean> {
  if (!isCoachConfigured() || (await isDemoSession())) {
    return false;
  }
  return athleteHasAiProcessingConsent(athleteId);
}

function sanitizeReading(reading: NutritionDayReading): NutritionDayReading {
  return {
    verdict: { ...reading.verdict, headline: sanitizeCoachCopy(reading.verdict.headline) },
    findings: reading.findings.map((finding) => ({
      ...finding,
      text: sanitizeCoachCopy(finding.text),
    })),
    action: { text: sanitizeCoachCopy(reading.action.text) },
    flaggedEntries: reading.flaggedEntries,
  };
}

export async function generateNutritionDayReading(input: {
  athleteId: string;
  trainingDayId: string;
  facts: NutritionAnalysisFacts;
  hash: string;
}): Promise<void> {
  try {
    const { output, usage } = await generateText({
      model: COACH_MODEL,
      output: Output.object({ schema: nutritionDayReadingSchema }),
      system: NUTRITION_ANALYSIS_SYSTEM,
      prompt: formatNutritionAnalysisPrompt(input.facts),
      providerOptions: coachAnalysisGatewayOptions,
    });
    void recordAiUsage(input.athleteId, 'analysis', usage);
    if (!output) {
      return;
    }
    await saveNutritionAnalysis({ ...input, reading: sanitizeReading(output), model: COACH_MODEL });
  } catch (error) {
    // The claim stays on this hash, so the retry window applies before the next attempt.
    console.error('[nutrition-analysis]', input.trainingDayId, error);
  }
}

export type PreparedNutritionReading = {
  view: NutritionCoachReadingView | null;
  /** Set when this request claimed the generation — run it after the response. */
  generate: (() => Promise<void>) | null;
};

/**
 * Resolves the coach reading block for one day. When the stored reading is
 * missing or stale, claims the generation and hands it back to the caller to
 * schedule — the page never waits on the model.
 */
export async function prepareNutritionCoachReading(
  athleteId: string,
  trainingDayId: string,
  now: Date = new Date(),
): Promise<PreparedNutritionReading> {
  const input = await loadNutritionAnalysisInput(athleteId, trainingDayId);
  if (!input) {
    return { view: null, generate: null };
  }
  const isPastDay = trainingDayId < format(now, 'yyyy-MM-dd');
  if (!isPastDay) {
    return { view: { state: 'awaiting_day_end' }, generate: null };
  }
  const facts = buildNutritionAnalysisFacts(input);
  const hash = nutritionAnalysisInputHash(facts);
  const [row, canGenerate] = await Promise.all([
    findNutritionAnalysisRow(athleteId, trainingDayId),
    canGenerateNutritionAnalysis(athleteId),
  ]);
  const decision = decideNutritionReading({ row, currentHash: hash, now, isPastDay, canGenerate });
  if (!decision.shouldGenerate) {
    return { view: decision.view, generate: null };
  }
  const claimed = await claimNutritionAnalysis({ athleteId, trainingDayId, hash, now });
  return {
    view: decision.view,
    generate: claimed
      ? () => generateNutritionDayReading({ athleteId, trainingDayId, facts, hash })
      : null,
  };
}
