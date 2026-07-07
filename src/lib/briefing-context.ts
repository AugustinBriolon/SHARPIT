import { differenceInCalendarDays, format, isSameDay, startOfDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BRIEFING_PHASE_LABELS,
  DAILY_PHASE_BRIEFING_LABELS,
  resolveBriefingPhase,
  resolveBriefingPhaseFromDailyPhase,
  type BriefingPhase,
} from '@/lib/briefing-phase';
import type { DailyPhase } from '@/lib/daily-phase/types';
import { getActivities, getPlannedSessions } from '@/lib/queries';
import { intensityLabels } from '@/lib/sessions';

const TYPE_FR: Record<string, string> = {
  RUN: 'Course',
  BIKE: 'Vélo',
  SWIM: 'Natation',
  STRENGTH: 'Renfo',
};

type ActivityWithMetrics = Awaited<ReturnType<typeof getActivities>>[number];

function formatMin(seconds?: number | null): string {
  if (!seconds) return '—';
  return `${Math.round(seconds / 60)} min`;
}

function formatPace(secPerKm?: number | null): string | null {
  if (secPerKm == null || secPerKm <= 0) return null;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}/km`;
}

function relativeDayLabel(activityDate: Date, refDate: Date): string {
  const diff = differenceInCalendarDays(startOfDay(refDate), startOfDay(activityDate));
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'hier';
  return format(activityDate, 'EEE d MMM', { locale: fr });
}

function formatActivityLine(a: ActivityWithMetrics, refDate: Date): string {
  const parts: string[] = [];
  if (a.runMetrics) {
    if (a.runMetrics.distanceM) parts.push(`${(a.runMetrics.distanceM / 1000).toFixed(1)} km`);
    const pace = formatPace(a.runMetrics.paceSecPerKm);
    if (pace) parts.push(pace);
    if (a.runMetrics.avgHr) parts.push(`${a.runMetrics.avgHr} bpm`);
  }
  if (a.bikeMetrics) {
    if (a.bikeMetrics.avgPower) parts.push(`${Math.round(a.bikeMetrics.avgPower)} W`);
    if (a.bikeMetrics.tss) parts.push(`TSS ${Math.round(a.bikeMetrics.tss)}`);
  }
  if (a.swimMetrics?.distanceM) parts.push(`${a.swimMetrics.distanceM} m`);
  const time = format(new Date(a.date), 'HH:mm');
  const rel = relativeDayLabel(new Date(a.date), refDate);
  const extra = [
    `à ${time}`,
    `(${rel})`,
    a.load != null ? `charge ${Math.round(a.load)}` : null,
    a.rpe != null ? `RPE ${a.rpe}` : null,
    a.feeling ? `ressenti ${a.feeling}` : null,
    parts.length ? parts.join(' · ') : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return `- ${TYPE_FR[a.type] ?? a.type}${a.title ? ` · ${a.title}` : ''} (${formatMin(a.duration)}) — ${extra}`;
}

export type BriefingDayContext = {
  phase: BriefingPhase;
  dailyPhase: DailyPhase | null;
  phaseLabel: string;
  todayLabel: string;
  sessionsDoneToday: string[];
  sessionsYesterday: string[];
  sessionsStillPlannedToday: string[];
  hasSessionsDoneToday: boolean;
};

/** Contexte structuré pour le briefing — sépare strictement aujourd'hui / hier / prévu. */
export async function buildBriefingDayContext(
  refDate: Date = new Date(),
  dailyPhase: DailyPhase | null = null,
): Promise<BriefingDayContext> {
  const today = startOfDay(refDate);
  const yesterday = subDays(today, 1);

  const [activities, plannedToday] = await Promise.all([
    getActivities({ limit: 40 }),
    getPlannedSessions({ from: today, to: today }),
  ]);

  const doneToday = activities
    .filter((a) => isSameDay(new Date(a.date), today))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const doneYesterday = activities
    .filter((a) => isSameDay(new Date(a.date), yesterday))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const stillPlanned = plannedToday.filter((p) => !p.completed && !p.activityId);

  const phase = dailyPhase
    ? resolveBriefingPhaseFromDailyPhase(dailyPhase)
    : resolveBriefingPhase(refDate);

  return {
    phase,
    dailyPhase,
    phaseLabel: dailyPhase ? DAILY_PHASE_BRIEFING_LABELS[dailyPhase] : BRIEFING_PHASE_LABELS[phase],
    todayLabel: format(today, 'EEEE d MMMM yyyy', { locale: fr }),
    sessionsDoneToday: doneToday.map((a) => formatActivityLine(a, refDate)),
    sessionsYesterday: doneYesterday.map((a) => formatActivityLine(a, refDate)),
    sessionsStillPlannedToday: stillPlanned.length
      ? stillPlanned.map((p) => {
          const bits = [
            TYPE_FR[p.type] ?? p.type,
            p.title ?? null,
            p.startTime ? `à ${p.startTime}` : null,
            p.intensity ? intensityLabels[p.intensity] : null,
            p.durationMin ? `${p.durationMin} min` : null,
          ].filter(Boolean);
          const line = `- ${bits.join(' · ')}`;
          return p.description ? `${line}\n  Consigne : ${p.description}` : line;
        })
      : [],
    hasSessionsDoneToday: doneToday.length > 0,
  };
}

export function formatBriefingDayContext(dayCtx: BriefingDayContext): string {
  const lines: string[] = [];
  lines.push(`Phase du jour : ${dayCtx.phaseLabel} (${dayCtx.todayLabel})`);

  lines.push("\n## Séances RÉALISÉES aujourd'hui (à mentionner comme fait aujourd'hui)");
  lines.push(
    dayCtx.sessionsDoneToday.length
      ? dayCtx.sessionsDoneToday.join('\n')
      : "Aucune séance réalisée aujourd'hui pour l'instant.",
  );

  lines.push("\n## Séances d'HIER (contexte uniquement — NE PAS les attribuer à aujourd'hui)");
  lines.push(
    dayCtx.sessionsYesterday.length ? dayCtx.sessionsYesterday.join('\n') : 'Aucune séance hier.',
  );

  lines.push("\n## Séances encore PRÉVUES aujourd'hui (pas encore réalisées)");
  lines.push(
    dayCtx.sessionsStillPlannedToday.length
      ? dayCtx.sessionsStillPlannedToday.join('\n')
      : 'Rien de planifié pour le reste de la journée.',
  );

  return lines.join('\n');
}

export async function briefingNeedsRegeneration(params: {
  trainingDayId: string;
  briefingGeneratedAt: Date | null;
  reasoningComputedAt: Date | null;
  latestSessionAt: Date | null;
}): Promise<boolean> {
  const { briefingGeneratedAt, reasoningComputedAt, latestSessionAt } = params;
  if (!briefingGeneratedAt) return true;
  if (reasoningComputedAt && briefingGeneratedAt < reasoningComputedAt) return true;
  if (latestSessionAt && latestSessionAt > briefingGeneratedAt) return true;
  return false;
}
