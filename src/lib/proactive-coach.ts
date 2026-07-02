import type { SessionIntensity } from '@prisma/client';
import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import type { SmartAlert } from './alerts';
import type { ClientPhysicalNote, ClientPlannedSession, ClientTrainingPlan } from './query/types';
import { estimatePlannedLoad } from './planning';
import { findPlanWeekForDate } from './periodization';
import { categoryLabels } from './physical';
import { intensityLabels } from './sessions';

const WEEK_OPTS = { weekStartsOn: 1 as const };

/** Catégories réellement aggravées par l'intensité (justifient d'alléger). */
const PAIN_LIKE_CATEGORIES = ['PAIN', 'INJURY'] as const;

const HARD_INTENSITIES: SessionIntensity[] = ['TEMPO', 'THRESHOLD', 'VO2MAX', 'RACE'];

export type ProactiveActionKind =
  | 'downgrade_session'
  | 'remove_session'
  | 'open_adapt'
  | 'open_plan_generator'
  | 'physical_checkin'
  | 'link_session'
  | 'info';

export interface ProactiveAction {
  id: string;
  priority: number;
  severity: 'danger' | 'warning' | 'info';
  title: string;
  detail: string;
  kind: ProactiveActionKind;
  sessionId?: string;
  noteId?: string;
  adaptFocus?: string;
  patch?: {
    intensity?: SessionIntensity;
    load?: number;
    title?: string;
    description?: string;
  };
}

interface HealthSnapshot {
  date: Date;
  recoveryScore: number | null;
  sleepMinutes: number | null;
  hrv: number | null;
}

function downgradeIntensity(current: SessionIntensity, readiness: number | null): SessionIntensity {
  if (readiness != null && readiness < 35) return 'RECOVERY';
  if (current === 'VO2MAX' || current === 'RACE') return 'ENDURANCE';
  if (current === 'THRESHOLD' || current === 'TEMPO') return 'ENDURANCE';
  return 'RECOVERY';
}

function isHardSession(s: ClientPlannedSession): boolean {
  return !s.completed && s.intensity != null && HARD_INTENSITIES.includes(s.intensity);
}

function weekPlannedLoad(planned: ClientPlannedSession[], weekStart: Date): number {
  const ws = startOfWeek(weekStart, WEEK_OPTS);
  const we = addDays(ws, 6);
  return planned
    .filter((p) => {
      const d = startOfDay(new Date(p.date));
      return d >= ws && d <= we;
    })
    .reduce((sum, p) => sum + estimatePlannedLoad(p), 0);
}

/** Actions priorisées du coach proactif (déterministe, sans IA). */
export function computeProactiveActions(params: {
  refDate?: Date;
  activities: { load: number | null; date: Date }[];
  health: HealthSnapshot[];
  physicalNotes: ClientPhysicalNote[];
  plannedSessions: ClientPlannedSession[];
  trainingPlan: ClientTrainingPlan | null | undefined;
  alerts: SmartAlert[];
  acwr: number;
  readinessScore: number | null;
  tsb: number | null;
}): ProactiveAction[] {
  const refDate = startOfDay(params.refDate ?? new Date());
  const actions: ProactiveAction[] = [];
  const today = refDate;
  const tomorrow = addDays(today, 1);

  const healthToday = params.health.find((h) => isSameDay(new Date(h.date), today));
  const sleepMin = healthToday?.sleepMinutes ?? null;

  const upcoming = params.plannedSessions
    .filter((p) => !p.completed && startOfDay(new Date(p.date)) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const todaySessions = upcoming.filter((p) => isSameDay(new Date(p.date), today));
  const tomorrowSessions = upcoming.filter((p) => isSameDay(new Date(p.date), tomorrow));

  // ---- Readiness basse + séance dure aujourd'hui ----
  if (params.readinessScore != null && params.readinessScore < 45) {
    const hard = todaySessions.find(isHardSession);
    if (hard?.intensity) {
      const next = downgradeIntensity(hard.intensity, params.readinessScore);
      actions.push({
        id: `downgrade-readiness-${hard.id}`,
        priority: 10,
        severity: params.readinessScore < 35 ? 'danger' : 'warning',
        title: "Alléger la séance d'aujourd'hui",
        detail: `Readiness ${params.readinessScore}/100 : passer « ${hard.title ?? 'séance'} » en ${intensityLabels[next].toLowerCase()} plutôt qu'en intensité élevée.`,
        kind: 'downgrade_session',
        sessionId: hard.id,
        patch: {
          intensity: next,
          load: hard.load ? Math.round(hard.load * 0.55) : undefined,
          description: hard.description
            ? `${hard.description}\n\n[Ajusté auto : readiness basse]`
            : 'Séance allégée automatiquement (readiness basse).',
        },
      });
    }
  }

  // ---- Sommeil court + séance dure demain ----
  if (sleepMin != null && sleepMin < 360) {
    const hard = tomorrowSessions.find(isHardSession);
    if (hard?.intensity) {
      actions.push({
        id: `downgrade-sleep-${hard.id}`,
        priority: 20,
        severity: sleepMin < 330 ? 'warning' : 'info',
        title: 'Revoir la séance de demain',
        detail: `Tu n'as dormi que ${Math.floor(sleepMin / 60)}h${String(sleepMin % 60).padStart(2, '0')} : envisage d'alléger « ${hard.title ?? 'la séance'} » prévue demain.`,
        kind: 'downgrade_session',
        sessionId: hard.id,
        patch: {
          intensity: downgradeIntensity(hard.intensity, params.readinessScore),
          load: hard.load ? Math.round(hard.load * 0.6) : undefined,
        },
      });
    }
  }

  // ---- ACWR élevé ----
  if (params.acwr >= 1.5) {
    const [hardSoon] = upcoming.filter((p) => {
      const diff = differenceInCalendarDays(new Date(p.date), today);
      return diff >= 0 && diff <= 3 && isHardSession(p);
    });

    if (hardSoon?.intensity) {
      actions.push({
        id: `downgrade-acwr-${hardSoon.id}`,
        priority: 15,
        severity: params.acwr >= 1.8 ? 'danger' : 'warning',
        title: "Réduire l'intensité imminente",
        detail: `ACWR ${params.acwr} (zone de risque) : allège « ${hardSoon.title ?? 'la prochaine séance dure'} » pour limiter la surcharge.`,
        kind: 'downgrade_session',
        sessionId: hardSoon.id,
        patch: {
          intensity: 'ENDURANCE',
          load: hardSoon.load ? Math.round(hardSoon.load * 0.5) : undefined,
        },
      });
    } else {
      actions.push({
        id: 'adapt-acwr',
        priority: 25,
        severity: params.acwr >= 1.8 ? 'danger' : 'warning',
        title: 'Réadapter le planning',
        detail: `Charge aiguë/chronique à ${params.acwr} — le coach peut alléger tes 14 prochains jours.`,
        kind: 'open_adapt',
        adaptFocus: `ACWR à ${params.acwr}, risque de surcharge. Réduis le volume et l'intensité des prochains jours.`,
      });
    }
  }

  // ---- Macro-plan : dépassement charge hebdo ----
  if (params.trainingPlan?.weeks?.length) {
    const planWeek = findPlanWeekForDate(params.trainingPlan.weeks, today);
    if (planWeek) {
      const planned = weekPlannedLoad(params.plannedSessions, today);
      if (planned > planWeek.targetLoad * 1.15) {
        actions.push({
          id: 'adapt-macro-over',
          priority: 30,
          severity: 'warning',
          title: 'Charge hebdo au-dessus du macro-plan',
          detail: `${Math.round(planned)} TSS planifiés vs ${planWeek.targetLoad} cible — rééquilibre la semaine.`,
          kind: 'open_adapt',
          adaptFocus: `Semaine ${format(planWeek.weekStart, 'd/MM')} : charge planifiée ${Math.round(planned)} TSS, cible macro-plan ${planWeek.targetLoad} TSS. Réduis ou déplace des séances.`,
        });
      } else if (
        planned < planWeek.targetLoad * 0.55 &&
        differenceInCalendarDays(today, startOfWeek(today, WEEK_OPTS)) >= 3
      ) {
        actions.push({
          id: 'plan-macro-under',
          priority: 50,
          severity: 'info',
          title: 'Semaine en sous-charge vs macro-plan',
          detail: `Seulement ${Math.round(planned)} TSS planifiés sur ${planWeek.targetLoad} cibles — tu peux générer des séances.`,
          kind: 'open_plan_generator',
        });
      }
    }
  }

  // ---- Douleur/blessure sévère + séance dure proche ----
  // On ne déclenche l'allègement que pour les douleurs/blessures (aggravées par
  // l'intensité), pas pour une posture ou un travail de mobilité.
  const [severePain] = params.physicalNotes
    .filter(
      (n) =>
        n.status !== 'RESOLVED' &&
        (n.severity ?? 0) >= 5 &&
        PAIN_LIKE_CATEGORIES.includes(n.category as (typeof PAIN_LIKE_CATEGORIES)[number]),
    )
    .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));

  if (severePain) {
    const hardSoon = upcoming.find(
      (p) => isHardSession(p) && differenceInCalendarDays(new Date(p.date), today) <= 2,
    );
    if (hardSoon) {
      const catLabel = categoryLabels[severePain.category];
      actions.push({
        id: `adapt-pain-${severePain.id}`,
        priority: 12,
        severity: (severePain.severity ?? 0) >= 7 ? 'danger' : 'warning',
        title: `Protéger : ${severePain.title}`,
        detail: `${catLabel} ${severePain.severity}/10 active avec une séance intense prévue — adapte ou annule.`,
        kind: 'open_adapt',
        adaptFocus: `${catLabel} active : ${severePain.title} (${severePain.severity}/10). Ne pas aggraver. Adapter les séances des prochains jours.`,
      });
    }
  }

  // ---- Réévaluation : toute note active suivie, sans point récent ----
  const [staleNote] = params.physicalNotes
    .filter(
      (n) =>
        n.status !== 'RESOLVED' &&
        (n.severity ?? 0) >= 3 &&
        PAIN_LIKE_CATEGORIES.includes(n.category as (typeof PAIN_LIKE_CATEGORIES)[number]),
    )
    .map((n) => {
      const [lastCheckin] = n.checkins;
      const daysSince = lastCheckin
        ? differenceInCalendarDays(today, new Date(lastCheckin.date))
        : differenceInCalendarDays(today, new Date(n.updatedAt));
      return { note: n, daysSince };
    })
    .filter((x) => x.daysSince >= 7)
    .sort((a, b) => b.daysSince - a.daysSince);

  if (staleNote) {
    actions.push({
      id: `checkin-${staleNote.note.id}`,
      priority: 35,
      severity: 'info',
      title: `Réévaluer : ${staleNote.note.title}`,
      detail: `${categoryLabels[staleNote.note.category]} sans point de suivi depuis ${staleNote.daysSince} jours — mets à jour son évolution.`,
      kind: 'physical_checkin',
      noteId: staleNote.note.id,
    });
  }

  // ---- Séances passées non liées ----
  const missed = params.plannedSessions.filter((p) => {
    const d = startOfDay(new Date(p.date));
    return !p.completed && !p.activityId && d < today && differenceInCalendarDays(today, d) <= 3;
  });
  if (missed.length > 0) {
    const [p] = missed;
    actions.push({
      id: `link-${p.id}`,
      priority: 40,
      severity: 'info',
      title: 'Séance à rattacher',
      detail: `« ${p.title ?? 'Séance planifiée'} » du ${format(new Date(p.date), 'd MMM')} n'est pas liée à une activité.`,
      kind: 'link_session',
      sessionId: p.id,
    });
  }

  // ---- TSB très négatif ----
  if (
    params.tsb != null &&
    params.tsb < -25 &&
    !actions.some((a) => a.id.startsWith('downgrade'))
  ) {
    actions.push({
      id: 'adapt-fatigue',
      priority: 22,
      severity: 'warning',
      title: 'Fatigue accumulée',
      detail: `TSB ${params.tsb} : ton corps est en dette — privilégie récup ou endurance légère.`,
      kind: 'open_adapt',
      adaptFocus: `TSB très négatif (${params.tsb}). Réduire charge et intensité des prochains jours.`,
    });
  }

  // Dédupliquer par sessionId pour downgrade (garder priorité la plus haute)
  const seen = new Set<string>();
  const deduped = actions
    .sort((a, b) => a.priority - b.priority)
    .filter((a) => {
      if (a.kind !== 'downgrade_session' || !a.sessionId) return true;
      if (seen.has(a.sessionId)) return false;
      seen.add(a.sessionId);
      return true;
    });

  return deduped.slice(0, 6);
}
