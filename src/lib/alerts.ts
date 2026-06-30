import { differenceInCalendarDays } from 'date-fns';
import { computeTrainingLoad } from '@/lib/training-load';

/**
 * Alertes intelligentes : détection déterministe de signaux de surcharge ou de
 * mauvaise récupération à partir des données déjà chargées (activités + santé).
 * Aucune IA : règles transparentes, calculées côté client, pour prévenir
 * blessure / surentraînement avant qu'ils ne s'installent.
 */

export type AlertSeverity = 'danger' | 'warning' | 'info';

export interface SmartAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
}

interface AlertActivity {
  load: number | null;
  date: Date;
}

interface AlertHealth {
  date: Date;
  recoveryScore: number | null;
  hrv: number | null;
  hrvStatus: string | null;
  restingHr: number | null;
  sleepMinutes: number | null;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  danger: 0,
  warning: 1,
  info: 2,
};

function sortedByDateDesc<T extends { date: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function avg(values: (number | null | undefined)[]): number | null {
  const ok = values.filter((v): v is number => v != null);
  return ok.length ? ok.reduce((s, v) => s + v, 0) / ok.length : null;
}

/**
 * Construit la liste d'alertes pour la date de référence.
 * `physicalNotes` : douleurs/blessures actives non résolues (sévérité 0-10).
 */
export function computeAlerts(params: {
  activities: AlertActivity[];
  health: AlertHealth[];
  physicalNotes: {
    title: string;
    severity: number | null;
    status: string;
    category?: string;
  }[];
  refDate?: Date;
}): SmartAlert[] {
  const { activities, physicalNotes } = params;
  const refDate = params.refDate ?? new Date();
  const alerts: SmartAlert[] = [];

  // ---- Charge aiguë/chronique (ACWR) ----
  const load = computeTrainingLoad(activities, refDate);
  if (load.acwr >= 1.5) {
    alerts.push({
      id: 'acwr-high',
      severity: load.acwr >= 1.8 ? 'danger' : 'warning',
      title: 'Charge en zone de risque',
      detail: `Ton ratio charge aiguë/chronique est à ${load.acwr} (seuil de risque ≥ 1.5). Le risque de blessure augmente nettement — étale ou réduis le volume des prochains jours.`,
    });
  }

  const health = sortedByDateDesc((params.health ?? []).filter((h) => new Date(h.date) <= refDate));

  // ---- Readiness basse plusieurs jours ----
  const recentReadiness = health
    .slice(0, 4)
    .map((h) => h.recoveryScore)
    .filter((v): v is number => v != null);
  const lowReadinessStreak = (() => {
    let streak = 0;
    for (const h of health) {
      if (h.recoveryScore == null) break;
      if (h.recoveryScore < 40) streak++;
      else break;
    }
    return streak;
  })();
  if (lowReadinessStreak >= 2) {
    alerts.push({
      id: 'readiness-low-streak',
      severity: lowReadinessStreak >= 3 ? 'danger' : 'warning',
      title: `Readiness basse ${lowReadinessStreak} jours d'affilée`,
      detail: `Ta readiness Garmin reste sous 40 depuis ${lowReadinessStreak} jours. Ton corps signale une récupération incomplète : privilégie le repos ou une séance très légère.`,
    });
  } else if (recentReadiness.length >= 3 && avg(recentReadiness)! < 45) {
    alerts.push({
      id: 'readiness-low-avg',
      severity: 'warning',
      title: 'Readiness moyenne faible',
      detail: `Readiness moyenne de ${Math.round(avg(recentReadiness)!)} sur les derniers jours. Allège l'intensité tant qu'elle ne remonte pas.`,
    });
  }

  // ---- HRV déséquilibrée / en baisse ----
  const [latest] = health;
  if (latest?.hrvStatus && /UNBALANCED_LOW|LOW|POOR/i.test(latest.hrvStatus)) {
    alerts.push({
      id: 'hrv-unbalanced',
      severity: 'warning',
      title: 'HRV déséquilibrée (basse)',
      detail:
        "Ta variabilité cardiaque est sous ta ligne de base : signe de fatigue, stress ou récupération incomplète. Évite les grosses intensités aujourd'hui.",
    });
  } else {
    const last3 = avg(health.slice(0, 3).map((h) => h.hrv));
    const prev = avg(health.slice(3, 10).map((h) => h.hrv));
    if (last3 != null && prev != null && prev > 0 && last3 < prev * 0.85) {
      alerts.push({
        id: 'hrv-drop',
        severity: 'warning',
        title: 'HRV en baisse marquée',
        detail: `Ta HRV récente (${Math.round(last3)} ms) est ~${Math.round((1 - last3 / prev) * 100)}% sous ta moyenne (${Math.round(prev)} ms). Surveille ta récupération.`,
      });
    }
  }

  // ---- FC repos élevée ----
  const rhrRecent = avg(health.slice(0, 3).map((h) => h.restingHr));
  const rhrBase = avg(health.slice(3, 17).map((h) => h.restingHr));
  if (rhrRecent != null && rhrBase != null && rhrRecent >= rhrBase + 5) {
    alerts.push({
      id: 'rhr-high',
      severity: 'warning',
      title: 'FC de repos élevée',
      detail: `Ta FC de repos récente (${Math.round(rhrRecent)} bpm) dépasse ta base (${Math.round(rhrBase)} bpm) de ${Math.round(rhrRecent - rhrBase)} bpm. Cela accompagne souvent fatigue, stress ou début d'infection.`,
    });
  }

  // ---- Dette de sommeil ----
  const sleep7 = avg(health.slice(0, 7).map((h) => h.sleepMinutes));
  if (sleep7 != null && sleep7 < 390) {
    alerts.push({
      id: 'sleep-debt',
      severity: sleep7 < 360 ? 'danger' : 'warning',
      title: 'Dette de sommeil',
      detail: `Tu dors en moyenne ${Math.floor(sleep7 / 60)}h${String(Math.round(sleep7 % 60)).padStart(2, '0')} sur 7 jours, sous le seuil de récupération (6h30). Le manque de sommeil dégrade adaptation et performance.`,
    });
  }

  // ---- Blessures / douleurs sévères actives ----
  // Limité aux douleurs/blessures : une posture/mobilité n'est pas une "douleur".
  const [severePain] = physicalNotes
    .filter(
      (n) =>
        n.status !== 'RESOLVED' &&
        (n.severity ?? 0) >= 6 &&
        (n.category == null || n.category === 'PAIN' || n.category === 'INJURY'),
    )
    .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
  if (severePain) {
    const label = severePain.category === 'INJURY' ? 'Blessure' : 'Douleur';
    alerts.push({
      id: 'pain-severe',
      severity: 'danger',
      title: `${label} élevée : ${severePain.title}`,
      detail: `Sévérité ${severePain.severity}/10. Ne charge pas cette zone : adapte ou repose tant que ça ne diminue pas, et consulte si ça persiste.`,
    });
  }

  // ---- Sous-charge prolongée (perte de forme) ----
  if (load.acwr > 0 && load.acwr < 0.8 && load.weeklyLoad > 0) {
    alerts.push({
      id: 'acwr-low',
      severity: 'info',
      title: 'Charge en baisse',
      detail: `Ton ratio charge aiguë/chronique est à ${load.acwr} (sous-charge < 0.8). Si ce n'est pas voulu (affûtage, repos), tu peux remonter progressivement le volume.`,
    });
  }

  return alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

/** Quelques infos de calendrier réutilisables si besoin ailleurs. */
export function daysSince(date: Date, refDate = new Date()): number {
  return differenceInCalendarDays(refDate, new Date(date));
}
