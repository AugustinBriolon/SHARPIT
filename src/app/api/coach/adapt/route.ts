import { generateText, Output } from "ai";
import { addDays, format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { NextResponse } from "next/server";
import { COACH_MODEL, coachGatewayOptions, isCoachConfigured } from "@/lib/ai";
import { buildCoachContext, formatCoachContext } from "@/lib/coach-context";
import { getPlannedSessions } from "@/lib/queries";
import { intensityLabels } from "@/lib/sessions";
import { adaptPlanSchema, adaptRequestSchema } from "@/lib/validators/coach";

export const maxDuration = 60;

const TYPE_FR: Record<string, string> = {
  RUN: "Course",
  BIKE: "Vélo",
  SWIM: "Natation",
  STRENGTH: "Renfo",
};

const SYSTEM_PROMPT = `Tu es un entraîneur expert en endurance. À partir de l'état de forme de l'athlète, de ce qu'il a RÉELLEMENT réalisé récemment (avec analyses prévu/réalisé) et de ses séances DÉJÀ PLANIFIÉES à venir, propose des ajustements pertinents du plan.

Pour chaque ajustement, choisis une action :
- MODIFY : modifier une séance existante (référence son sessionId, indique les champs à changer).
- REMOVE : supprimer une séance existante (sessionId).
- ADD : ajouter une nouvelle séance (sessionId=null, fournis une date yyyy-MM-dd dans la fenêtre).

Principes :
- Si l'athlète a fait plus dur/long que prévu (fatigue accrue), allège ou recule les séances clés.
- S'il a fait plus facile ou manqué, tu peux densifier raisonnablement.
- Respecte la périodisation vers la course et la règle 80/20.
- Ne propose QUE des changements utiles : laisse les séances déjà bonnes telles quelles (ne les liste pas).
- Renseigne uniquement les champs à modifier pour MODIFY ; mets null ailleurs.
Réponds en français.`;

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

  const body = await req.json().catch(() => ({}));
  const parsed = adaptRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }
  const { days = 14, focus } = parsed.data;

  const today = startOfDay(new Date());
  const horizon = addDays(today, days);

  const [ctx, upcoming] = await Promise.all([
    buildCoachContext(today),
    getPlannedSessions({ from: today, to: horizon }),
  ]);

  // Séances à venir avec IDs (référence pour MODIFY/REMOVE)
  const upcomingLines = upcoming.map((p) => {
    const bits = [
      `id=${p.id}`,
      format(p.date, "EEE d MMM", { locale: fr }),
      TYPE_FR[p.type] ?? p.type,
      p.intensity ? intensityLabels[p.intensity] : null,
      p.durationMin ? `${p.durationMin} min` : null,
      p.load ? `${Math.round(p.load)} TSS` : null,
      p.title ? `"${p.title}"` : null,
      p.completed ? "[réalisée]" : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return `- ${bits}`;
  });

  const prompt = `${focus ? `Demande de l'athlète : ${focus}\n\n` : ""}Fenêtre d'ajustement : du ${format(today, "d MMM", { locale: fr })} au ${format(horizon, "d MMM yyyy", { locale: fr })} (dates ADD au format yyyy-MM-dd dans cette fenêtre).

${formatCoachContext(ctx)}

## Séances déjà planifiées à venir (à ajuster)
${upcomingLines.length ? upcomingLines.join("\n") : "Aucune séance planifiée à venir."}`;

  try {
    const { output } = await generateText({
      model: COACH_MODEL,
      output: Output.object({ schema: adaptPlanSchema }),
      system: SYSTEM_PROMPT,
      prompt,
      providerOptions: coachGatewayOptions,
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error("[coach/adapt]", error);
    return NextResponse.json(
      { error: "La réadaptation a échoué. Réessaie." },
      { status: 500 },
    );
  }
}
