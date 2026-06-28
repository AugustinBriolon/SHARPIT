import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { COACH_MODEL, coachGatewayOptions, isCoachConfigured } from "@/lib/ai";
import { buildCoachContext, formatCoachContext } from "@/lib/coach-context";
import { coachTools } from "@/lib/coach-tools";

export const maxDuration = 60;

const SYSTEM_PROMPT = `Tu es le coach personnel d'endurance de l'athlète (triathlon, course, vélo, natation).

Tu as accès à ses données réelles ci-dessous : état de forme (CTL/ATL/TSB), récupération (readiness, HRV, sommeil), seuils physiologiques, objectifs et séances récentes/planifiées.

Tu peux AGIR directement sur le calendrier via tes outils :
- listPlannedSessions : récupère les séances à venir (avec leur id) — appelle-le AVANT toute modification ou suppression.
- createPlannedSession : ajoute une séance.
- updatePlannedSession : modifie une séance existante (par id).
- deletePlannedSession : supprime une séance (par id).

Important : créer, modifier et supprimer une séance demande la VALIDATION de l'athlète. Tu proposes l'action via l'outil, mais elle ne s'applique qu'après son accord. Si une proposition est refusée, ne la répète pas : propose une alternative ou demande des précisions.

Règles :
- Réponds de façon concise, concrète et actionnable, en t'appuyant TOUJOURS sur les données fournies (cite les chiffres pertinents).
- Quand l'athlète te demande d'ajuster/créer/supprimer des séances, explique d'abord brièvement ton raisonnement, puis propose les actions via les outils (une par séance concernée). N'invente pas d'id : passe d'abord par listPlannedSessions.
- Pour une refonte complète d'une semaine, tu peux suggérer le bouton « Générer ma semaine », mais privilégie les propositions ciblées.
- Respecte IMPÉRATIVEMENT la condition physique déclarée (douleurs, blessures) : n'aggrave jamais une zone sensible.
- Mets en forme tes réponses en Markdown (titres, listes, gras) de façon lisible.
- Si une donnée manque, dis-le clairement plutôt que d'inventer.
- Réponds toujours en français.`;

export async function POST(req: Request) {
  if (!isCoachConfigured()) {
    return NextResponse.json(
      {
        error:
          "Coach IA non configuré. Ajoute une clé AI_GATEWAY_API_KEY dans .env.",
      },
      { status: 503 },
    );
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const ctx = await buildCoachContext();
  const system = `${SYSTEM_PROMPT}\n\n---\n${formatCoachContext(ctx)}`;

  const result = streamText({
    model: COACH_MODEL,
    system,
    messages: await convertToModelMessages(messages),
    tools: coachTools,
    // Les actions qui modifient le calendrier nécessitent la validation de l'athlète.
    // listPlannedSessions (lecture seule) s'exécute automatiquement.
    toolApproval: {
      createPlannedSession: "user-approval",
      updatePlannedSession: "user-approval",
      deletePlannedSession: "user-approval",
    },
    stopWhen: stepCountIs(8),
    providerOptions: coachGatewayOptions,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
