import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { NextResponse } from 'next/server';
import {
  COACH_MAX_OUTPUT_TOKENS,
  COACH_MODEL,
  coachGatewayOptions,
  isCoachConfigured,
} from '@sharpit/server/lib/ai';
import { buildBusySummary } from '@sharpit/server/lib/coach/plan/calendar-availability';
import {
  buildCoachContext,
  formatCoachContext,
} from '@sharpit/server/lib/coach/context/coach-context';
import { createCoachTools } from '@sharpit/server/lib/coach/chat/tools/coach-tools';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { recordAiUsage } from '@sharpit/server/lib/ai/usage';
import {
  RETRY_AFTER_HEADER,
  aiBudgetResponseBody,
  ensureFreeAiBudget,
  withAiBudgetWarningHeader,
} from '@sharpit/server/lib/access/ai-budget';
import { requireAiProcessingConsent } from '@sharpit/server/lib/privacy/consent-store';
import { formatStrengthSessionRules } from '@sharpit/server/lib/planned-session/strength/strength-session-template';
import {
  checkRateLimit,
  rateLimitJsonResponse,
  rateLimiters,
} from '@sharpit/server/lib/rate-limit';
import { COACH_COPY_DASH_RULE } from '@sharpit/app/lib/coach/sanitize-coach-copy';
import { resolveCoachDiscussServerContext } from '@sharpit/server/lib/coach/chat/discuss/coach-discuss-server-context';
import {
  startCoachChatTiming,
  type CoachChatTiming,
} from '@sharpit/server/lib/coach/chat/coach-chat-timing';
import { withCoachTrace } from '@sharpit/server/lib/ai/coach-trace';
import { lastCoachDiscussMetadata } from '@sharpit/server/lib/coach/chat/discuss/coach-discuss-metadata-parse';
import {
  classifyCoachIntent,
  coachRequestScope,
  isPlanningThread,
  lastUserText,
  type CoachRequestScope,
} from '@sharpit/server/lib/coach/chat/coach-request-scope';

/** Horizon de pré-chargement de l'agenda, aligné sur les séances du contexte. */
const AGENDA_PREFETCH_DAYS = 14;

const SYSTEM_PROMPT = `Tu es un entraîneur d'élite en sports d'endurance (triathlon, course, vélo, natation), spécialiste de la périodisation, de la physiologie de l'effort, du renforcement et du développement à long terme de l'athlète.

Tu ne te contentes pas de répondre : tu prends des décisions d'entraînement en exploitant TOUTES les données disponibles de l'athlète (fournies plus bas). Chaque recommandation est personnalisée. Jamais de plan générique.

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
- setTravelContext : enregistre un NOUVEAU déplacement/vacances (ville + dates) pour pré-remplir les séances outdoor et calibrer la météo. Utilise-le seulement si aucun déplacement de « Déplacements / voyages » ne couvre déjà ces dates ; sinon le contexte existe : lis-le et applique ses sports, ne le recrée jamais. Cet outil met déjà à jour automatiquement le lieu des séances outdoor dans la période — ne rappelle PAS updatePlannedSession séance par séance sauf pour changer autre chose (date, intensité, titre…).
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
- Dès qu'un objectif sportif est actif, et SI le renfo ou la mobilité figure dans les sports pratiqués, le planning hebdo doit inclure du STRENGTH préventif spécifique au sport ET de la mobilité/étirements ciblés — sauf contrainte voyage MOBILITY_ONLY/NONE ou capacité REST_ONLY. Sinon, n'ajoute pas de STRENGTH.
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

${COACH_COPY_DASH_RULE}

## Anti-boucle (impératif)
- Le contexte système suffit dans la grande majorité des cas : réponds sans outil plutôt que d'aller rechercher ce que tu as déjà. Maximum 3 appels utiles par réponse.
- Ne répète jamais le même paragraphe, la même analyse ou la même proposition. Après avoir proposé des créations/modifications, ARRÊTE et attends la validation.`;

type BudgetWarning = Awaited<ReturnType<typeof ensureFreeAiBudget>>['warning'];

/** Consent, rate limit and free AI budget — in that order, before any model work. */
async function guardCoachChat(
  athleteId: string,
): Promise<{ blocked: Response } | { budgetWarning: BudgetWarning }> {
  const aiBlocked = await requireAiProcessingConsent(athleteId);
  if (aiBlocked) {
    return { blocked: aiBlocked };
  }

  const rateLimit = await checkRateLimit(rateLimiters.coachChat, athleteId, { failClosed: true });
  if (!rateLimit.ok) {
    const limited = rateLimitJsonResponse(rateLimit);
    return { blocked: NextResponse.json(limited.body, { status: limited.status }) };
  }

  const budget = await ensureFreeAiBudget(athleteId);
  if (!budget.allowed) {
    return {
      blocked: NextResponse.json(aiBudgetResponseBody(budget.retryAfterSeconds!), {
        status: 402,
        headers: { [RETRY_AFTER_HEADER]: String(budget.retryAfterSeconds) },
      }),
    };
  }
  return { budgetWarning: budget.warning };
}

/** Not read for this question: the model knows it can still fetch it before placing a session. */
const AGENDA_NOT_LOADED = `\n\n## Agenda\nNon chargé pour cette question. Avant de placer ou déplacer une séance, appelle getCalendarAvailability.`;

function formatAgendaBlock(busySummary: string | null): string {
  return busySummary
    ? `\n\n## Agenda — créneaux occupés (${AGENDA_PREFETCH_DAYS} prochains jours)\nPlace chaque séance sur un créneau LIBRE, entre 06:00 et 21:00. Tiens compte de la durée disponible : si le trou est plus court que la séance idéale, raccourcis-la ou déplace-la, et explique-le.\n${busySummary}`
    : `\n\n## Agenda\nAucun agenda connecté : propose des heures réalistes (06:00–21:00) ou laisse l'heure vide.`;
}

async function buildCoachSystemPrompt(
  athleteId: string,
  loadDiscussBlock: () => Promise<string | null>,
  scope: CoachRequestScope,
  timing?: CoachChatTiming,
) {
  const timed = async <T>(key: string, work: Promise<T>): Promise<T> => {
    const startedAt = performance.now();
    const value = await work;
    timing?.note(key, Math.round(performance.now() - startedAt));
    return value;
  };
  // The agenda ships with the context rather than behind a tool: a scheduling
  // turn otherwise spent a whole extra step fetching it, resending the entire
  // prefix afterwards. One cheap read here replaces that round trip.
  const [ctx, busySummary, discussBlock] = await Promise.all([
    timed('contextMs', buildCoachContext(athleteId)),
    // An external calendar read: only when the question may place a session.
    scope.readsAgenda
      ? timed('agendaMs', buildBusySummary(athleteId, new Date(), AGENDA_PREFETCH_DAYS))
      : null,
    timed('discussMs', loadDiscussBlock()),
  ]);
  const discussSection = discussBlock ? `\n\n${discussBlock}` : '';
  return {
    practicedSports: ctx.practicedSports,
    system: `${SYSTEM_PROMPT}\n\n---\n${formatCoachContext(ctx, scope.sections ?? undefined)}${agendaSection(scope, busySummary)}${discussSection}`,
  };
}

/** The agenda read for a planning turn; otherwise a pointer to the tool, when the turn has it. */
function agendaSection(scope: CoachRequestScope, busySummary: string | null): string {
  if (scope.readsAgenda) {
    return formatAgendaBlock(busySummary);
  }
  const canPlace = scope.tools === null || scope.tools.includes('getCalendarAvailability');
  return canPlace ? AGENDA_NOT_LOADED : '';
}

async function streamCoachReply(input: {
  athleteId: string;
  system: string;
  messages: UIMessage[];
  practicedSports: Awaited<ReturnType<typeof buildCoachContext>>['practicedSports'];
  budgetWarning: BudgetWarning;
  timing: CoachChatTiming;
  scope: CoachRequestScope;
}): Promise<Response> {
  const { timing, scope } = input;
  const { athleteId } = input;
  const result = streamText({
    model: COACH_MODEL,
    system: input.system,
    messages: await convertToModelMessages(input.messages),
    tools: createCoachTools(athleteId, { practicedSports: input.practicedSports }),
    // Only the tools this question can use: fewer schemas in every step's prompt.
    ...(scope.tools ? { activeTools: [...scope.tools] } : {}),
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
    // No smoothing: a 12 ms pause per word held a long answer back by seconds, on a screen
    // the athlete is waiting on. Clients render the stream as it comes.
    reasoning: scope.reasoning,
    maxOutputTokens: COACH_MAX_OUTPUT_TOKENS.conversational,
    providerOptions: coachGatewayOptions,
    telemetry: {
      functionId: 'coach-chat',
    },
    onChunk: ({ chunk }) => {
      if (chunk.type === 'text-delta') {
        timing.firstText();
      }
    },
    onFinish: ({ totalUsage, steps }) => {
      void recordAiUsage(athleteId, 'coach', totalUsage);
      timing.note('steps', steps.length);
      timing.note('inputTokens', totalUsage.inputTokens ?? 0);
      timing.note('outputTokens', totalUsage.outputTokens ?? 0);
      timing.note('reasoningTokens', totalUsage.outputTokenDetails?.reasoningTokens ?? 0);
      console.info('[coach-chat] timing', timing.summary());
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
    headers: withAiBudgetWarningHeader({}, input.budgetWarning),
  });
}

export async function POST(req: Request) {
  if (!isCoachConfigured()) {
    return NextResponse.json(
      {
        error: 'Coach IA non configuré. Ajoute une clé AI_GATEWAY_API_KEY dans .env.',
      },
      { status: 503 },
    );
  }

  const timing = startCoachChatTiming();
  const athleteId = await getCurrentAthleteId();
  const { messages } = (await req.json()) as { messages: UIMessage[] };

  // Discuss metadata is client-supplied: entitlements are settled here, before
  // any kind-specific data is read or any model call is made.
  const discuss = await resolveCoachDiscussServerContext(athleteId, messages);
  if (discuss.status === 'forbidden') {
    return NextResponse.json({ error: discuss.error }, { status: 403 });
  }

  const scope = coachRequestScope(
    classifyCoachIntent({
      lastUserText: lastUserText(messages),
      discussKind: lastCoachDiscussMetadata(messages)?.discussKind ?? null,
      isPlanningThread: isPlanningThread(messages),
    }),
  );

  // The guard (consent, rate limit, budget) and the prompt's reads run together: nothing
  // reaches the model before the guard has passed, but neither waits on the other.
  const prompt = buildCoachSystemPrompt(athleteId, discuss.loadBlock, scope, timing);
  prompt.catch(() => undefined);
  const guard = await guardCoachChat(athleteId);
  timing.mark('guard');
  if ('blocked' in guard) {
    return guard.blocked;
  }
  const { system, practicedSports } = await prompt;
  timing.mark('prompt');
  timing.note('promptChars', system.length);
  timing.note('messages', messages.length);
  console.info('[coach-chat] scope', { intent: scope.intent, tools: scope.tools?.length ?? 'all' });
  return withCoachTrace({ traceName: 'coach-chat', athleteId, tags: ['chat', scope.intent] }, () =>
    streamCoachReply({
      athleteId,
      system,
      messages,
      practicedSports,
      budgetWarning: guard.budgetWarning,
      timing,
      scope,
    }),
  );
}
