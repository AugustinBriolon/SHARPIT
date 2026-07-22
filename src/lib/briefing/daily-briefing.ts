import { buildBriefingDayContext, formatBriefingDayContext } from '@/lib/briefing/briefing-context';
import {
  resolveBriefingPhase,
  resolveBriefingPhaseFromDailyPhase,
} from '@/lib/briefing/briefing-phase';
import { buildDailyPhaseDayContext } from '@/lib/daily-phase/day-context';
import { resolveDailyPhase } from '@/lib/daily-phase/resolve';
import {
  buildDeterministicBriefingFallback,
  validateBriefingContent,
} from '@/lib/briefing/briefing-validation';
import { generateText } from 'ai';
import { COACH_MODEL, coachGatewayOptions, isCoachConfigured } from '@/lib/ai';
import {
  buildCoachContext,
  formatCoachContext,
  invalidateCoachContext,
} from '@/lib/coach/coach-context';
import { prisma } from '@/lib/prisma';
import { getActivities, getPlannedSessions } from '@/lib/queries';
import { startOfDay } from 'date-fns';

async function resolveAthleteCentricBriefingPhase(refDate: Date) {
  const dayStart = startOfDay(refDate);
  const [activities, plannedSessions] = await Promise.all([
    getActivities({ limit: 40 }),
    getPlannedSessions({ from: dayStart, to: dayStart }),
  ]);
  const dayContext = buildDailyPhaseDayContext(
    refDate,
    activities as never,
    plannedSessions as never,
  );
  const resolution = resolveDailyPhase(
    {
      dayContext,
      athlete: {
        recommendationAvailable: true,
        adviceActionable: true,
        dailyStrainAvailable: false,
        newSessionSincePriorSnapshot: false,
        newInferenceSincePriorSnapshot: false,
        newObservationsSincePriorSnapshot: false,
        minutesSinceLastActivity: null,
        minutesSinceSnapshotGenerated: null,
        priorPhase: null,
        sleepLoggedTonight: false,
      },
      localHour: refDate.getHours(),
    },
    refDate,
  );
  return {
    briefingPhase: resolveBriefingPhaseFromDailyPhase(resolution.phase),
    dailyPhase: resolution.phase,
  };
}

function buildBriefingSystem(phase: ReturnType<typeof resolveBriefingPhase>): string {
  const phaseRules: Record<typeof phase, string> = {
    morning:
      "Focus : état de forme au réveil + séance(s) prévue(s) aujourd'hui. Pas de débrief de séances pas encore faites.",
    midday:
      "Focus : état actuel + séances déjà réalisées ce matin + ce qui reste prévu cet après-midi. Ne confonds pas hier et aujourd'hui.",
    afternoon:
      "Focus : débrief des séances déjà réalisées aujourd'hui + ajustement pour le reste de la journée (récup, séance restante ou repos).",
    evening:
      "Focus : bilan de la journée d'entraînement + récupération pour demain. Parle au passé pour les séances du jour.",
  };

  return `Tu es le coach d'endurance personnel de l'athlète. Tu rédiges son ${phase === 'morning' ? 'BILAN DU MATIN' : 'BILAN DU JOUR'} : court, concret, motivant, basé sur ses données réelles.

${phaseRules[phase]}

RÈGLES IMPÉRATIVES sur les séances :
- Les séances listées dans "RÉALISÉES aujourd'hui" sont AUJOURD'HUI uniquement.
- Les séances listées dans "HIER" sont HIER — ne les présente JAMAIS comme des séances d'aujourd'hui.
- Si une séance est hier (ex. natation hier) et une autre aujourd'hui (ex. vélo ce midi), mentionne-les avec la bonne temporalité.
- Ne fusionne pas plusieurs séances de jours différents en une seule phrase "aujourd'hui".

Structure (markdown concis, pas de titre niveau 1/2) :
- **Accroche** : état de forme actuel (readiness, TSB, sommeil, HRV) — 1-2 chiffres clés.
- **Séances** : selon la phase — prévu (matin), débrief réalisé + reste (après-midi), bilan du jour (soir).
- **Point d'attention** (optionnel) : blessure, fatigue, surcharge.

5 à 8 lignes max. Pas de blabla. Respecte IMPÉRATIVEMENT les douleurs/blessures. Français, tutoiement.`;
}

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/** Génère le texte du bilan du jour (sans le persister). */
export async function generateDailyBriefingContent(refDate: Date = new Date()): Promise<{
  content: string;
  readiness: number | null;
  phaseAtGeneration: ReturnType<typeof resolveBriefingPhase>;
}> {
  invalidateCoachContext();
  const { briefingPhase: phase, dailyPhase } = await resolveAthleteCentricBriefingPhase(refDate);
  const [ctx, dayCtx] = await Promise.all([
    buildCoachContext(refDate),
    buildBriefingDayContext(refDate, dailyPhase),
  ]);

  const prompt = `${formatCoachContext(ctx)}

${formatBriefingDayContext(dayCtx)}

Rédige le ${dayCtx.phaseLabel} en suivant la structure imposée et les règles de temporalité.`;

  const { text } = await generateText({
    model: COACH_MODEL,
    system: buildBriefingSystem(phase),
    prompt,
    providerOptions: coachGatewayOptions,
  });

  const llmContent = text.trim();
  const validation = validateBriefingContent(llmContent, dayCtx, ctx);
  const content = validation.valid ? llmContent : buildDeterministicBriefingFallback(dayCtx, ctx);

  if (!validation.valid) {
    console.warn('[daily-briefing] validation failed:', validation.reason);
  }

  return { content, readiness: ctx.health.readinessToday, phaseAtGeneration: phase };
}

/** Lit le bilan stocké pour une date (null si absent). */
export async function getDailyBriefing(refDate: Date = new Date()) {
  return prisma.dailyBriefing.findUnique({
    where: { date: utcDateOnly(refDate) },
  });
}

/** Génère le bilan du jour et le stocke (upsert sur la date). */
export async function generateAndStoreDailyBriefing(refDate: Date = new Date()) {
  if (!isCoachConfigured()) {
    throw new Error('Coach IA non configuré (AI_GATEWAY_API_KEY manquante).');
  }
  const { content, readiness, phaseAtGeneration } = await generateDailyBriefingContent(refDate);
  const date = utcDateOnly(refDate);
  return prisma.dailyBriefing.upsert({
    where: { date },
    create: { date, content, readiness, phaseAtGeneration },
    update: { content, readiness, phaseAtGeneration, generatedAt: new Date() },
  });
}
