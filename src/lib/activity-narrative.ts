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

On te fournit des FAITS structurés sur la séance ET le contexte athlète (récupération, sommeil, charge, seuils personnels, conditions physiques, environnement). Tu rédiges une analyse narrative courte en français.

OBJECTIF : croiser les dimensions — pas seulement décrire la séance. Cherche des liens plausibles entre performance, récupération, charge récente, sommeil, conditions physiques et environnement.

RÈGLES :
- Appuie-toi UNIQUEMENT sur les faits fournis. N'invente aucun chiffre.
- Ne répète PAS mécaniquement distance, durée, TSS ou allure déjà visibles ailleurs sur la page : cite-les seulement s'ils servent de preuve à une interprétation (ex. « allure ralentie malgré FC modérée → chaleur ou fatigue cumulée »).
- Si readiness basse : cherche une cause probable dans sommeil/dette de sommeil, charge (ACWR/TSB), HRV ou condition physique active — pas seulement la météo.
- Si une condition physique active existe (douleur, posture, sciatique…) et que la séance sollicite potentiellement cette zone, mentionne-la avec prudence et un point de vigilance concret.
- Compare la performance aux seuils personnels (LTHR, FTP, allure seuil) quand disponibles, plutôt qu'à des moyennes génériques seules.
- Ton bienveillant, précis, sans jargon inutile.
- headline : une phrase accrocheuse orientée interprétation (max ~100 caractères).
- narrative : 2 à 4 phrases fluides avec au moins une connexion entre systèmes (pas une liste de stats). Intègre les chiffres clés dans le texte plutôt que sous forme de liste.
- Si peu de données contextuelles, dis-le honnêtement et concentre-toi sur ce qui est disponible.
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
 * Génère et persiste l'analyse narrative si absente (ou si force=true).
 * Retourne true si une nouvelle analyse a été créée.
 */
export async function runActivityNarrativeAnalysis(
  activityId: string,
  options?: { force?: boolean },
): Promise<boolean> {
  if (!isCoachConfigured()) return false;

  const existing = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { narrativeAnalyzedAt: true, date: true, narrativeAnalysis: true },
  });
  if (!existing || !isEligibleForActivityNarrative(existing.date)) return false;
  if (existing.narrativeAnalyzedAt && !options?.force) return false;

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
