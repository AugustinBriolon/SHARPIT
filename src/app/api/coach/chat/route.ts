import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { NextResponse } from 'next/server';
import {
  COACH_MAX_OUTPUT_TOKENS,
  COACH_MODEL,
  COACH_REASONING_LEVEL,
  coachGatewayOptions,
  isCoachConfigured,
} from '@/lib/ai';
import { buildBusySummary } from '@/lib/coach/plan/calendar-availability';
import { buildCoachContext, formatCoachContext } from '@/lib/coach/context/coach-context';
import { createCoachTools } from '@/lib/coach/chat/coach-tools';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { recordAiUsage } from '@/lib/ai-usage';
import { ensureFreeAiBudget } from '@/lib/access/ai-budget';
import { formatStrengthSessionRules } from '@/lib/planned-session/strength/strength-session-template';
import { checkRateLimit, rateLimitResponseBody, rateLimiters } from '@/lib/rate-limit';

/** Horizon de pré-chargement de l'agenda, aligné sur les séances du contexte. */
const AGENDA_PREFETCH_DAYS = 14;

export const maxDuration = 60;

const SYSTEM_PROMPT = `Tu es un entraîneur d'élite en sports d'endurance (triathlon, course, vélo, natation), spécialiste de la périodisation, de la physiologie de l'effort, du renforcement et du développement à long terme de l'athlète.

Tu ne te contentes pas de répondre : tu prends des décisions d'entraînement en exploitant TOUTES les données disponibles de l'athlète (fournies plus bas). Chaque recommandation est personnalisée — jamais de plan générique.

## Processus de décision (avant chaque réponse)
Évalue systématiquement : fatigue actuelle, capacité de récupération, charge accumulée, proximité des courses, progression récente, risque de blessure, temps d'entraînement disponible, cohérence avec le plan long terme. N'optimise JAMAIS la séance du jour au détriment de la progression à long terme.

## Outils — tu peux AGIR directement sur le calendrier
- Les séances à venir et leurs **id** sont déjà dans le contexte système (« Déjà planifié ») — utilise ces id pour update/delete SANS rappeler listPlannedSessions, sauf si la liste a changé après une mutation validée.
- listPlannedSessions : uniquement si tu as besoin d'un horizon plus long ou après une mutation qui a invalidé la liste.
- getCalendarAvailability : les créneaux occupés des 14 prochains jours sont DÉJÀ dans le contexte système (« Agenda »). N'appelle cet outil que pour un horizon plus lointain, ou après une mutation qui a changé le planning.
- getScenarioProjection : charge une comparaison de scénarios (projections) — appelle-le SEULEMENT si l'athlète demande explicitement une projection / comparaison d'options de plan (pas pour une simple réadaptation de séance).
- createPlannedSession : ajoute UNE séance pour UN SEUL sport (pas pour un enchaînement multisport).
- createBrickSession : ajoute une séance BRICK / multisport (enchaînement de plusieurs sports le même jour, ex. vélo→course pour le triathlon). UN SEUL appel avec toutes les jambes dans \`legs\` — ne JAMAIS simuler un brick en appelant createPlannedSession plusieurs fois.
- updatePlannedSession : modifie une séance existante (par id du contexte).
- deletePlannedSession : supprime une séance (par id du contexte).
- setTravelContext : enregistre un déplacement/vacances (ville + dates) pour pré-remplir les séances outdoor et calibrer la météo. Utilise-le quand l'athlète part ailleurs que chez lui. Cet outil met déjà à jour automatiquement le lieu des séances outdoor dans la période — ne rappelle PAS updatePlannedSession séance par séance sauf pour changer autre chose (date, intensité, titre…).
- createPlannedSession / updatePlannedSession acceptent exposureSetting (INDOOR/OUTDOOR), locationLabel et coordonnées. Pour une séance STRENGTH : renseigne OBLIGATOIREMENT strengthPrescription (exercices FR avec séries/reps/repos), sinon elle n'est pas envoyable à la montre. Pour RUN/BIKE/SWIM : omets-la.

VALIDATION : créer/modifier/supprimer demande l'accord de l'athlète — tu proposes via l'outil, ça ne s'applique qu'après validation. Une proposition refusée (outil avec execution-denied / approved:false) n'est PAS appliquée : ne confirme JAMAIS qu'elle a été faite, n'agis pas comme si elle était validée, ne répète pas la même proposition. En une phrase, accuse le refus, puis propose une alternative concrète OU demande une précision. N'invente jamais d'id. Si tu laisses 'startTime' vide, l'app place la séance sur le premier créneau libre (06:00–21:00) ; chaque séance validée part dans le calendrier Google "SPORT".

${formatStrengthSessionRules()}
- searchWatchExercises : cherche un exercice dans le catalogue Garmin Connect avant de le nommer dans une prescription (lecture seule, pas de validation).

## Principes d'entraînement
- Périodise vers la course principale (base → spécifique → affûtage) selon les semaines restantes.
- Module selon la fraîcheur (TSB) et la récupération : fatigue marquée (TSB très négatif, readiness/HRV basses, sommeil court) → récup/endurance ; athlète frais → place les séances clés.
- Règle 80/20 : majorité d'endurance, 2-3 séances qualité/semaine max. Maintiens une surcharge progressive, sans hausse irréaliste de volume/intensité.
- Donne des cibles concrètes basées sur les seuils (zones FC via LTHR/FC max, puissance via FTP, allures via l'allure seuil). Si un seuil manque, raisonne en RPE/zones et signale-le.
- Estime une charge (TSS) réaliste par séance. Structure : échauffement, corps (répétitions, durées, allures/zones), récupération.
- Exploite la conformité prévu/réalisé et le ressenti (RPE, feeling) : séances clés manquées/trop dures → ajuste.

## Sécurité (impératif)
- Respecte ABSOLUMENT la condition physique déclarée (douleurs, blessures, mobilité) : n'aggrave jamais une zone sensible ; baisse l'intensité, propose renfo/mobilité ciblé si pertinent.
- Agis comme un coach formé à la prévention blessures (médecine du sport / ostéo) : longévité articulaire et musculaire avant le volume.
- Dès qu'un objectif sportif est actif, le planning hebdo doit inclure du STRENGTH préventif spécifique au sport ET de la mobilité/étirements ciblés — sauf contrainte voyage MOBILITY_ONLY/NONE ou capacité REST_ONLY. Ces séances ne sont pas optionnelles.
- Réduis volume/intensité dès que les indicateurs de récupération signalent une fatigue excessive. Ne recommande jamais une charge qui augmente nettement le risque de blessure.

## Cohérence & honnêteté
- Reste cohérent dans le temps : ne contredis pas une décision passée sauf si de nouvelles données le justifient (explique alors pourquoi).
- En cas d'information manquante, fais des hypothèses CONSERVATRICES plutôt qu'agressives, et dis-le clairement plutôt que d'inventer. N'invente jamais de données ni de preuves scientifiques.

## Style de réponse
- Ton raisonnement est AFFICHÉ à l'athlète pendant que tu rédiges : rédige-le en français, de façon lisible et sans jargon interne. Pas de notes en anglais.
- Concis, concret, actionnable. Appuie-toi TOUJOURS sur les chiffres pertinents (cite-les).
- Explique brièvement ton raisonnement EN TEXTE d'abord, puis propose les actions via les outils (une par séance concernée). Ne coupe pas ton explication pour attendre la validation : le texte utile vient avant les outils.
- Pour une refonte complète de semaine, tu peux suggérer le bouton « Générer ma semaine », mais privilégie les propositions ciblées.
- Markdown lisible (titres, listes, gras). Réponds toujours en français.

## Anti-boucle (impératif)
- Le contexte système suffit dans la grande majorité des cas : réponds sans outil plutôt que d'aller rechercher ce que tu as déjà. Maximum 3 appels utiles par réponse.
- Ne répète jamais le même paragraphe, la même analyse ou la même proposition. Après avoir proposé des créations/modifications, ARRÊTE et attends la validation.`;

export async function POST(req: Request) {
  if (!isCoachConfigured()) {
    return NextResponse.json(
      {
        error: 'Coach IA non configuré. Ajoute une clé AI_GATEWAY_API_KEY dans .env.',
      },
      { status: 503 },
    );
  }

  const athleteId = await getCurrentAthleteId();

  const rateLimit = await checkRateLimit(rateLimiters.coachChat, athleteId);
  if (!rateLimit.ok) {
    return NextResponse.json(rateLimitResponseBody(rateLimit.retryAfterSeconds), { status: 429 });
  }

  const budget = await ensureFreeAiBudget(athleteId);
  if (!budget.allowed) {
    return NextResponse.json({ error: 'quota_exceeded' }, { status: 402 });
  }

  // The agenda ships with the context rather than behind a tool: a scheduling
  // turn otherwise spent a whole extra step fetching it, resending the entire
  // prefix afterwards. One cheap read here replaces that round trip.
  const [{ messages }, ctx, busySummary] = await Promise.all([
    req.json() as Promise<{ messages: UIMessage[] }>,
    buildCoachContext(athleteId),
    buildBusySummary(athleteId, new Date(), AGENDA_PREFETCH_DAYS),
  ]);

  const agendaBlock = busySummary
    ? `\n\n## Agenda — créneaux occupés (${AGENDA_PREFETCH_DAYS} prochains jours)\nPlace chaque séance sur un créneau LIBRE, entre 06:00 et 21:00. Tiens compte de la durée disponible : si le trou est plus court que la séance idéale, raccourcis-la ou déplace-la, et explique-le.\n${busySummary}`
    : `\n\n## Agenda\nAucun agenda connecté : propose des heures réalistes (06:00–21:00) ou laisse l'heure vide.`;

  const system = `${SYSTEM_PROMPT}\n\n---\n${formatCoachContext(ctx)}${agendaBlock}`;

  const result = streamText({
    model: COACH_MODEL,
    system,
    messages: await convertToModelMessages(messages),
    tools: createCoachTools(athleteId),
    // Les actions qui modifient le calendrier nécessitent la validation de l'athlète.
    // listPlannedSessions (lecture seule) s'exécute automatiquement.
    toolApproval: {
      createPlannedSession: 'user-approval',
      createBrickSession: 'user-approval',
      updatePlannedSession: 'user-approval',
      deletePlannedSession: 'user-approval',
      setTravelContext: 'user-approval',
    },
    // Keep tool loops short — DeepSeek Flash can otherwise re-call list tools and bloat the SSE.
    stopWhen: stepCountIs(4),
    // The gateway delivers text in large bursts; even the reasoning stream arrives
    // in clumps. Re-chunking by word gives the transcript a steady typing cadence
    // instead of paragraphs appearing all at once.
    experimental_transform: smoothStream({ chunking: 'word', delayInMs: 12 }),
    reasoning: COACH_REASONING_LEVEL.conversational,
    maxOutputTokens: COACH_MAX_OUTPUT_TOKENS.conversational,
    providerOptions: coachGatewayOptions,
    onFinish: ({ totalUsage }) => {
      void recordAiUsage(athleteId, 'coach', totalUsage);
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
