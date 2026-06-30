import { generateText } from 'ai';
import { format, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { COACH_MODEL, coachGatewayOptions, isCoachConfigured } from './ai';
import { buildCoachContext, formatCoachContext } from './coach-context';
import { prisma } from './prisma';
import { getPlannedSessions } from './queries';
import { intensityLabels } from './sessions';

const TYPE_FR: Record<string, string> = {
  RUN: 'Course',
  BIKE: 'Vélo',
  SWIM: 'Natation',
  STRENGTH: 'Renfo',
};

const BRIEFING_SYSTEM = `Tu es le coach d'endurance personnel de l'athlète. Tu rédiges son BILAN DU MATIN : court, concret, motivant, basé sur ses données réelles (forme, récupération, charge, objectifs, condition physique) fournies plus bas.

Structure imposée (markdown concis, pas de titre de niveau 1/2) :
- **Une phrase d'accroche** sur l'état de forme du jour (readiness, TSB, sommeil, HRV) — factuelle et cite 1-2 chiffres clés.
- **Séance du jour** : si une séance est prévue, rappelle-la brièvement et donne un conseil d'exécution OU un ajustement (intensité/durée) cohérent avec la forme et la condition physique. Si rien n'est prévu, propose quoi faire (séance type ou repos) selon la forme.
- **Point d'attention** (optionnel, seulement si pertinent) : fatigue marquée, readiness basse, douleur/blessure à respecter, charge trop élevée.

Règles : 5 à 8 lignes maximum. Pas de blabla, pas de répétition du contexte brut. Appuie-toi sur les chiffres. Respecte IMPÉRATIVEMENT les douleurs/blessures. Reste bienveillant et actionnable. Réponds en français, en tutoyant l'athlète.`;

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/** Génère le texte du bilan du jour (sans le persister). */
export async function generateDailyBriefingContent(
  refDate: Date = new Date(),
): Promise<{ content: string; readiness: number | null }> {
  const today = startOfDay(refDate);
  const ctx = await buildCoachContext(refDate);
  const planned = await getPlannedSessions({ from: today, to: today });

  const sessionLines = planned.length
    ? planned
        .map((p) => {
          const bits = [
            TYPE_FR[p.type] ?? p.type,
            p.title ?? null,
            p.startTime ? `à ${p.startTime}` : null,
            p.intensity ? intensityLabels[p.intensity] : null,
            p.durationMin ? `${p.durationMin} min` : null,
            p.completed ? '(déjà réalisée)' : null,
          ].filter(Boolean);
          const line = `- ${bits.join(' · ')}`;
          return p.description ? `${line}\n  Consigne : ${p.description}` : line;
        })
        .join('\n')
    : "Aucune séance planifiée aujourd'hui.";

  const prompt = `${formatCoachContext(ctx)}

## Séance(s) prévue(s) aujourd'hui (${format(today, 'EEEE d MMMM', { locale: fr })})
${sessionLines}

Rédige le bilan du matin en suivant la structure imposée.`;

  const { text } = await generateText({
    model: COACH_MODEL,
    system: BRIEFING_SYSTEM,
    prompt,
    providerOptions: coachGatewayOptions,
  });

  return { content: text.trim(), readiness: ctx.health.readinessToday };
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
  const { content, readiness } = await generateDailyBriefingContent(refDate);
  const date = utcDateOnly(refDate);
  return prisma.dailyBriefing.upsert({
    where: { date },
    create: { date, content, readiness },
    update: { content, readiness, generatedAt: new Date() },
  });
}
