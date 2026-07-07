import { ActivityType } from '@prisma/client';
import { generateText, Output } from 'ai';
import { COACH_MODEL, coachGatewayOptions, isCoachConfigured } from '@/lib/ai';
import {
  isEligibleForActivityNarrative,
  NARRATIVE_ANALYSIS_SINCE,
} from '@/lib/activity-narrative-config';
import { buildActivityNarrativeFacts } from '@/lib/activity-narrative-facts';
import { enrichGoalsWithProgress } from '@/lib/goal-achievements';
import { getGoals } from '@/lib/queries';
import { prisma } from '@/lib/prisma';
import { activityNarrativeSchema, type ActivityNarrative } from '@/lib/validators/coach';

const NARRATIVE_SYSTEM = `Tu es un entraîneur expert en endurance pour l'application SHARPIT.

On te fournit des FAITS calculés (comparatifs 30 jours, récupération, objectifs, météo). Tu rédiges une analyse narrative courte en français.

RÈGLES :
- Appuie-toi UNIQUEMENT sur les faits fournis. N'invente aucun chiffre.
- Ton bienveillant, précis, sans jargon inutile.
- headline : une phrase accrocheuse (max ~100 caractères).
- narrative : 2 à 4 phrases fluides, style « Votre course a été… ».
- highlights : 2 à 4 puces courtes avec les comparatifs les plus marquants.
- Si peu de données comparatives, dis-le honnêtement sans dramatiser.
- Intègre météo, ressenti (RPE/feeling) et récupération quand c'est pertinent.
- Mentionne les objectifs validés si présents.`;

export async function setActivityNarrativeAnalysis(
  activityId: string,
  analysis: ActivityNarrative,
): Promise<void> {
  const analyzedAt = new Date();
  await prisma.activity.update({
    where: { id: activityId },
    data: {
      narrativeAnalysis: analysis,
      narrativeAnalyzedAt: analyzedAt,
    },
  });
}

/**
 * Génère et persiste l'analyse narrative si absente.
 * Retourne true si une nouvelle analyse a été créée.
 */
export async function runActivityNarrativeAnalysis(activityId: string): Promise<boolean> {
  if (!isCoachConfigured()) return false;

  const existing = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { narrativeAnalyzedAt: true, date: true },
  });
  if (existing?.narrativeAnalyzedAt) return false;
  if (!existing || !isEligibleForActivityNarrative(existing.date)) return false;

  try {
    const goals = await getGoals();
    await enrichGoalsWithProgress(goals);
  } catch (error) {
    console.error('[activity-narrative] goals sync', error);
  }

  const facts = await buildActivityNarrativeFacts(activityId);
  if (!facts) return false;

  const { output } = await generateText({
    model: COACH_MODEL,
    output: Output.object({ schema: activityNarrativeSchema }),
    system: NARRATIVE_SYSTEM,
    prompt: facts,
    providerOptions: coachGatewayOptions,
  });

  if (!output) return false;

  await setActivityNarrativeAnalysis(activityId, output);
  return true;
}

/** Lance l'analyse pour des activités nouvellement importées (best-effort, séquentiel). */
export async function runActivityNarrativeForIds(activityIds: string[]): Promise<void> {
  for (const id of activityIds) {
    try {
      await runActivityNarrativeAnalysis(id);
    } catch (error) {
      console.error('[activity-narrative]', id, error);
    }
  }
}

/** Remplit les analyses manquantes depuis {@link NARRATIVE_ANALYSIS_SINCE}. */
export async function backfillActivityNarratives(): Promise<{
  eligible: number;
  created: number;
}> {
  if (!isCoachConfigured()) return { eligible: 0, created: 0 };

  const activities = await prisma.activity.findMany({
    where: {
      narrativeAnalyzedAt: null,
      date: { gte: NARRATIVE_ANALYSIS_SINCE },
      type: { in: [ActivityType.RUN, ActivityType.BIKE, ActivityType.SWIM] },
    },
    select: { id: true },
    orderBy: { date: 'asc' },
  });

  let created = 0;
  for (const { id } of activities) {
    try {
      if (await runActivityNarrativeAnalysis(id)) created += 1;
    } catch (error) {
      console.error('[activity-narrative/backfill]', id, error);
    }
  }

  return { eligible: activities.length, created };
}
