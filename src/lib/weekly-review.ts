import { generateText } from 'ai';
import {
  addDays,
  differenceInCalendarDays,
  format,
  startOfDay,
  startOfWeek,
  subDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { COACH_MODEL, coachGatewayOptions, isCoachConfigured } from './ai';
import { buildCoachContext, formatCoachContext } from '@/lib/coach/coach-context';
import { prisma } from './prisma';
import { getActivities, getHealthEntries, getPlannedSessions } from './queries';
import { analyzeSleep, formatClock, formatDuration, type SleepEntryInput } from '@/lib/sleep/sleep';

const TYPE_FR: Record<string, string> = {
  RUN: 'Course',
  BIKE: 'Vélo',
  SWIM: 'Natation',
  STRENGTH: 'Renfo',
};

const WEEKLY_SYSTEM = `Tu es le coach d'endurance personnel de l'athlète. Tu rédiges sa RÉTROSPECTIVE HEBDOMADAIRE : un bilan de la semaine écoulée, factuel et actionnable, basé uniquement sur ses données réelles fournies plus bas.

Structure imposée (markdown concis, pas de titre de niveau 1) :
## Bilan de la semaine
2-3 phrases : volume réalisé vs prévu, respect du plan, et état de forme global (charge, TSB). Cite des chiffres clés.

## Sommeil & récupération
2-3 phrases sur la qualité du sommeil de la semaine (durée, score, phases profond/REM, régularité des horaires) et son impact sur la récupération (HRV, FC repos, readiness). Sois précis avec les chiffres du sommeil.

## Points forts & points d'attention
Liste à puces courte (2-4 points) : ce qui a bien marché, ce qui doit être surveillé (fatigue, séances manquées, sommeil insuffisant, charge).

## Plan pour la semaine prochaine
2-3 recommandations concrètes (orientation des séances, récupération, sommeil) cohérentes avec la forme actuelle et l'objectif.

Règles : reste concis (12-18 lignes au total). Appuie-toi sur les chiffres réels, ne les invente pas. Respecte IMPÉRATIVEMENT les douleurs/blessures. Tutoie l'athlète, en français. Sois bienveillant mais honnête.`;

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/** Lundi de la semaine contenant `d` (ou de la semaine précédente). */
export function weekStartFor(d: Date): Date {
  return startOfWeek(startOfDay(d), { weekStartsOn: 1 });
}

function avg(values: (number | null | undefined)[]): number | null {
  const ok = values.filter((v): v is number => v != null);
  return ok.length ? ok.reduce((s, v) => s + v, 0) / ok.length : null;
}

function sum(values: (number | null | undefined)[]): number {
  return values.reduce<number>((s, v) => s + (v ?? 0), 0);
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  sessionsDone: number;
  sessionsPlanned: number;
  sessionsCompleted: number;
  totalLoad: number;
  totalDurationMin: number;
  prevTotalLoad: number;
  byType: { type: string; count: number; durationMin: number }[];
  avgComplianceScore: number | null;
  sleep: {
    avgDurationMin: number | null;
    avgScore: number | null;
    avgDeepPct: number | null;
    avgRemPct: number | null;
    regularityMin: number | null;
    recommendedBedtimeMin: number | null;
  };
  recovery: {
    avgReadiness: number | null;
    avgHrv: number | null;
    avgRestingHr: number | null;
  };
}

/** Construit les statistiques de la semaine [weekStart, weekStart+6]. */
async function buildWeeklyStats(weekStart: Date): Promise<WeeklyStats> {
  const weekEnd = addDays(weekStart, 6);
  const prevStart = subDays(weekStart, 7);

  const [activities, planned, health] = await Promise.all([
    getActivities({ limit: 200 }),
    getPlannedSessions({ from: weekStart, to: weekEnd }),
    getHealthEntries(21),
  ]);

  const inWeek = activities.filter((a) => {
    const d = new Date(a.date);
    return d >= weekStart && d <= addDays(weekEnd, 1);
  });
  const inPrev = activities.filter((a) => {
    const d = new Date(a.date);
    return d >= prevStart && d < weekStart;
  });

  const byTypeMap = new Map<string, { count: number; durationMin: number }>();
  for (const a of inWeek) {
    const key = TYPE_FR[a.type] ?? a.type;
    const cur = byTypeMap.get(key) ?? { count: 0, durationMin: 0 };
    cur.count += 1;
    cur.durationMin += a.duration ? Math.round(a.duration / 60) : 0;
    byTypeMap.set(key, cur);
  }

  const compliance = planned
    .filter((p) => p.completed && p.analysis)
    .map((p) => (p.analysis as { complianceScore?: number }).complianceScore)
    .filter((v): v is number => v != null);

  const weekHealth = health.filter((h) => {
    const d = new Date(h.date);
    return d >= weekStart && d <= addDays(weekEnd, 1);
  });

  const sleepView = analyzeSleep(weekHealth as unknown as SleepEntryInput[]);

  return {
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    weekEnd: format(weekEnd, 'yyyy-MM-dd'),
    sessionsDone: inWeek.length,
    sessionsPlanned: planned.length,
    sessionsCompleted: planned.filter((p) => p.completed).length,
    totalLoad: Math.round(sum(inWeek.map((a) => a.load))),
    totalDurationMin: Math.round(sum(inWeek.map((a) => a.duration)) / 60),
    prevTotalLoad: Math.round(sum(inPrev.map((a) => a.load))),
    byType: [...byTypeMap.entries()].map(([type, v]) => ({ type, ...v })),
    avgComplianceScore: compliance.length ? Math.round(avg(compliance)!) : null,
    sleep: {
      avgDurationMin: sleepView.avg.durationMin,
      avgScore: sleepView.avg.score,
      avgDeepPct: sleepView.avg.deepPct,
      avgRemPct: sleepView.avg.remPct,
      regularityMin: sleepView.regularityMin,
      recommendedBedtimeMin: sleepView.recommendedBedtimeMin,
    },
    recovery: {
      avgReadiness: avg(weekHealth.map((h) => h.recoveryScore)),
      avgHrv: avg(weekHealth.map((h) => h.hrv)),
      avgRestingHr: avg(weekHealth.map((h) => h.restingHr)),
    },
  };
}

function formatWeeklyStats(stats: WeeklyStats): string {
  const lines: string[] = [];
  const start = new Date(`${stats.weekStart}T00:00:00`);
  const end = new Date(`${stats.weekEnd}T00:00:00`);
  lines.push(
    `## Semaine du ${format(start, 'd MMM', { locale: fr })} au ${format(end, 'd MMM yyyy', { locale: fr })}`,
  );

  const loadDelta =
    stats.prevTotalLoad > 0
      ? Math.round(((stats.totalLoad - stats.prevTotalLoad) / stats.prevTotalLoad) * 100)
      : null;
  lines.push(
    `Volume : ${stats.sessionsDone} séance(s), ${formatDuration(stats.totalDurationMin)}, charge ${stats.totalLoad}${
      loadDelta != null
        ? ` (${loadDelta > 0 ? '+' : ''}${loadDelta}% vs semaine précédente ${stats.prevTotalLoad})`
        : ''
    }.`,
  );
  if (stats.byType.length) {
    lines.push(
      `Répartition : ${stats.byType
        .map((t) => `${t.type} ${t.count} (${formatDuration(t.durationMin)})`)
        .join(' · ')}.`,
    );
  }
  lines.push(
    `Plan : ${stats.sessionsCompleted}/${stats.sessionsPlanned} séance(s) planifiée(s) réalisée(s)${
      stats.avgComplianceScore != null ? `, conformité moyenne ${stats.avgComplianceScore}/100` : ''
    }.`,
  );

  const s = stats.sleep;
  const sleepBits = [
    s.avgDurationMin != null ? `durée moy ${formatDuration(s.avgDurationMin)}` : null,
    s.avgScore != null ? `score moy ${s.avgScore}/100` : null,
    s.avgDeepPct != null ? `profond ${s.avgDeepPct}%` : null,
    s.avgRemPct != null ? `REM ${s.avgRemPct}%` : null,
    s.regularityMin != null ? `régularité ±${s.regularityMin} min` : null,
    s.recommendedBedtimeMin != null
      ? `coucher conseillé ${formatClock(s.recommendedBedtimeMin)}`
      : null,
  ].filter(Boolean);
  lines.push(`Sommeil : ${sleepBits.length ? sleepBits.join(' · ') : 'données limitées'}.`);

  const r = stats.recovery;
  const recBits = [
    r.avgReadiness != null ? `readiness moy ${Math.round(r.avgReadiness)}/100` : null,
    r.avgHrv != null ? `HRV moy ${Math.round(r.avgHrv)} ms` : null,
    r.avgRestingHr != null ? `FC repos moy ${Math.round(r.avgRestingHr)} bpm` : null,
  ].filter(Boolean);
  if (recBits.length) lines.push(`Récupération : ${recBits.join(' · ')}.`);

  return lines.join('\n');
}

/** Génère le texte de la rétro hebdo (sans la persister). */
export async function generateWeeklyReviewContent(
  weekStart: Date,
): Promise<{ content: string; stats: WeeklyStats }> {
  const [stats, ctx] = await Promise.all([
    buildWeeklyStats(weekStart),
    buildCoachContext(addDays(weekStart, 6)),
  ]);
  // Contexte global de l'athlète (objectifs, forme, blessures, planifié à venir),
  // pris à la fin de la semaine concernée.

  const prompt = `${formatCoachContext(ctx)}

${formatWeeklyStats(stats)}

Rédige la rétrospective hebdomadaire en suivant la structure imposée. Mets l'accent sur l'analyse du sommeil de la semaine et son lien avec la récupération et la performance.`;

  const { text } = await generateText({
    model: COACH_MODEL,
    system: WEEKLY_SYSTEM,
    prompt,
    providerOptions: coachGatewayOptions,
  });

  return { content: text.trim(), stats };
}

/** Lit la rétro hebdo stockée pour la semaine contenant `refDate`. */
export async function getWeeklyReview(refDate: Date = new Date()) {
  return prisma.weeklyReview.findUnique({
    where: { weekStart: utcDateOnly(weekStartFor(refDate)) },
  });
}

/**
 * Génère et stocke la rétro hebdo. Par défaut on traite la semaine ÉCOULÉE
 * (utile pour un cron lancé en début de semaine), sauf si `current` est vrai.
 */
export async function generateAndStoreWeeklyReview(
  refDate: Date = new Date(),
  options: { current?: boolean } = {},
) {
  if (!isCoachConfigured()) {
    throw new Error('Coach IA non configuré (AI_GATEWAY_API_KEY manquante).');
  }
  const base = options.current ? refDate : subDays(weekStartFor(refDate), 1);
  const weekStart = weekStartFor(base);
  const { content, stats } = await generateWeeklyReviewContent(weekStart);
  const date = utcDateOnly(weekStart);
  return prisma.weeklyReview.upsert({
    where: { weekStart: date },
    create: { weekStart: date, content, stats: stats as object },
    update: { content, stats: stats as object, generatedAt: new Date() },
  });
}

/** True si on est dimanche (pour déclenchement cron). */
export function isSunday(d: Date = new Date()): boolean {
  return d.getDay() === 0;
}

/** Nombre de jours écoulés depuis la fin de la semaine la plus récente revue. */
export function daysSinceWeekEnd(weekStart: Date, refDate = new Date()): number {
  return differenceInCalendarDays(refDate, addDays(weekStart, 6));
}
