import { generateText, Output } from "ai";
import { addDays, format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { NextResponse } from "next/server";
import { COACH_MODEL, coachGatewayOptions, isCoachConfigured } from "@/lib/ai";
import { buildCoachContext, formatCoachContext } from "@/lib/coach-context";
import {
  coachPlanRequestSchema,
  coachPlanSchema,
} from "@/lib/validators/coach";

export const maxDuration = 60;

const SYSTEM_PROMPT = `Tu es un entraîneur expert en sports d'endurance (triathlon, course à pied, cyclisme, natation), spécialiste de la périodisation et de la physiologie de l'effort.

Ta mission : proposer des séances d'entraînement précises, personnalisées et sûres à partir des données réelles de l'athlète fournies ci-dessous.

Principes à respecter impérativement :
- Périodise vers la course principale (base → spécifique → affûtage). Adapte le volume et l'intensité au nombre de semaines restantes.
- Ajuste selon la fraîcheur (TSB) et la récupération (readiness, HRV, sommeil) : si l'athlète est fatigué (TSB très négatif, readiness basse), propose de la récup/endurance ; s'il est frais, place les séances clés.
- Respecte les jours d'entraînement habituels de l'athlète. Place le repos sur les autres jours.
- Évite de dupliquer ce qui est déjà planifié.
- Règle 80/20 : majorité d'endurance, séances intenses dosées (en général 2-3 séances qualité par semaine max).
- Donne des cibles concrètes basées sur les seuils de l'athlète (zones FC à partir de LTHR/FC max, puissance à partir de la FTP, allures à partir de l'allure seuil). Si les seuils manquent, raisonne en RPE/zones et signale-le.
- Estime une charge (TSS) réaliste par séance.
- Tiens compte de l'exécution récente (conformité prévu/réalisé) et du ressenti (RPE, feeling) : si les dernières séances clés ont été manquées ou trop dures, ajuste en conséquence.
- Respecte IMPÉRATIVEMENT la condition physique déclarée (douleurs, blessures, mobilité) : n'aggrave jamais une zone sensible, propose du renfo/mobilité ciblé et baisse l'intensité si besoin.
- Sois concret dans la description : échauffement, corps de séance (répétitions, durées, allures/zones), récupération.

Réponds toujours en français.`;

export async function POST(req: Request) {
  if (!isCoachConfigured()) {
    return NextResponse.json(
      {
        error:
          "Coach IA non configuré. Ajoute une clé AI_GATEWAY_API_KEY dans le fichier .env (Vercel → AI Gateway → API Keys), puis redémarre le serveur.",
      },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = coachPlanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  const { startDate, days = 7, focus } = parsed.data;
  const start = startOfDay(startDate ?? new Date());

  const ctx = await buildCoachContext(start);
  const contextText = formatCoachContext(ctx);

  const prompt = `Génère un plan d'entraînement couvrant ${days} jour(s) à partir du ${format(
    start,
    "EEEE d MMMM yyyy",
    { locale: fr },
  )} (dayOffset 0 = ce jour-là, dayOffset 1 = lendemain, etc.).

${focus ? `Demande spécifique de l'athlète : ${focus}\n\n` : ""}Données de l'athlète :

${contextText}`;

  try {
    const { output } = await generateText({
      model: COACH_MODEL,
      output: Output.object({ schema: coachPlanSchema }),
      system: SYSTEM_PROMPT,
      prompt,
      providerOptions: coachGatewayOptions,
    });

    const sessions = [...output.sessions]
      .sort((a, b) => a.dayOffset - b.dayOffset)
      .map((s) => ({
        ...s,
        date: format(addDays(start, s.dayOffset), "yyyy-MM-dd"),
      }));

    return NextResponse.json({
      summary: output.summary,
      startDate: format(start, "yyyy-MM-dd"),
      sessions,
    });
  } catch (error) {
    console.error("[coach/plan]", error);
    return NextResponse.json(
      { error: "La génération a échoué. Réessaie dans un instant." },
      { status: 500 },
    );
  }
}
