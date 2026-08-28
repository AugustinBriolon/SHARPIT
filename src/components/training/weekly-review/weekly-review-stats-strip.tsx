import {
  DrillDownStatsStrip,
  type StatsStripItem,
} from '@/components/today/drill-down/stats-strip';
import { formatDuration } from '@/lib/sleep/sleep';
import type { WeeklyStats } from '@/lib/weekly-review';

/** Trajectoire de charge vs semaine précédente — même vocabulaire de flèches
 * que le reste de l'app (§11.2 : ↗ hausse, → stable, ↘ baisse). */
function loadTrend(totalLoad: number, prevTotalLoad: number): string | undefined {
  if (prevTotalLoad <= 0) {
    return undefined;
  }
  const pct = Math.round(((totalLoad - prevTotalLoad) / prevTotalLoad) * 100);
  if (Math.abs(pct) < 5) {
    return '→ stable';
  }
  return pct > 0 ? `↗ +${pct}%` : `↘ ${pct}%`;
}

/**
 * La lecture instrument avant la narration : les chiffres bruts que le texte
 * généré interprète, pas un jugement — pas de tonalité couleur ici, seule
 * la synthèse du coach porte l'interprétation.
 */
export function buildWeeklyReviewStatsItems(stats: WeeklyStats): StatsStripItem[] {
  const items: StatsStripItem[] = [];

  items.push({
    label: 'Séances',
    value: `${stats.sessionsCompleted}/${stats.sessionsPlanned}`,
  });

  items.push({
    label: 'Charge',
    value: `${Math.round(stats.totalLoad)}`,
    sub: loadTrend(stats.totalLoad, stats.prevTotalLoad),
  });

  if (stats.sleep.avgDurationMin !== null || stats.sleep.avgScore !== null) {
    items.push({
      label: 'Sommeil',
      value: formatDuration(stats.sleep.avgDurationMin),
      sub: stats.sleep.avgScore !== null ? `${Math.round(stats.sleep.avgScore)}/100` : undefined,
    });
  }

  if (stats.recovery.avgReadiness !== null) {
    items.push({
      label: 'Récup',
      value: `${Math.round(stats.recovery.avgReadiness)}`,
      sub: '/100',
    });
  }

  return items;
}

export function WeeklyReviewStatsStrip({ stats }: { stats: WeeklyStats }) {
  const items = buildWeeklyReviewStatsItems(stats);
  return <DrillDownStatsStrip items={items} />;
}
