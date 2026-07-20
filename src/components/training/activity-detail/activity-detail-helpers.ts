import type { HeroActivity } from '@/components/training/activity-hero-stats';
import { SPORT_IDENTITY_SURFACE } from '@/lib/activity/sport-identity';
import { formatDuration } from '@/lib/format';
import { ActivityType } from '@prisma/client';
import type { LucideIcon } from 'lucide-react';
import { Bike, Dumbbell, Footprints, Medal, Shapes, Waves } from 'lucide-react';
import type { ActivityDetail, ActivitySpec, ActivityStat, ChipTone } from './types';

export const sportIcon: Record<ActivityType, LucideIcon> = {
  RUN: Footprints,
  BIKE: Bike,
  SWIM: Waves,
  STRENGTH: Dumbbell,
  TRIATHLON: Medal,
  OTHER: Shapes,
};

/** @deprecated Prefer `SPORT_IDENTITY_SURFACE` from `@/lib/activity/sport-identity`. */
export const sportIconWrap = SPORT_IDENTITY_SURFACE;

export const chipDot: Record<ChipTone, string> = {
  neutral: 'bg-muted-foreground',
  done: 'bg-primary',
  amber: 'bg-signal-caution',
  orange: 'bg-signal-vo2',
  red: 'bg-signal-risk',
};

export const chipLinkSurface: Record<ChipTone, string> = {
  neutral:
    'border-analysis-border/60 bg-analysis-surface-alt/50 hover:border-analysis-border hover:bg-analysis-surface-alt',
  done: 'border-primary/30 bg-primary/10 hover:border-primary/50 hover:bg-primary/15',
  amber:
    'border-signal-caution/30 bg-signal-caution/10 hover:border-signal-caution/50 hover:bg-signal-caution/15',
  orange: 'border-signal-vo2/30 bg-signal-vo2/10 hover:border-signal-vo2/50 hover:bg-signal-vo2/15',
  red: 'border-signal-risk/30 bg-signal-risk/10 hover:border-signal-risk/50 hover:bg-signal-risk/15',
};

export const chipStaticSurface: Record<ChipTone, string> = {
  neutral: 'border-analysis-border bg-analysis-surface',
  done: 'border-primary/30 bg-primary/10',
  amber: 'border-signal-caution/30 bg-signal-caution/10',
  orange: 'border-signal-vo2/30 bg-signal-vo2/10',
  red: 'border-signal-risk/30 bg-signal-risk/10',
};

export const chipIconTone: Record<ChipTone, string> = {
  neutral: 'text-muted-foreground',
  done: 'text-primary',
  amber: 'text-signal-caution',
  orange: 'text-signal-vo2',
  red: 'text-signal-risk',
};

export function activitySourceLabel(activity: {
  source: string;
  garminId?: string | null;
  stravaId?: string | null;
}): string {
  if (activity.source === 'both' || (activity.garminId && activity.stravaId)) {
    return 'Garmin + Strava';
  }
  if (activity.garminId || activity.source === 'garmin') return 'Garmin';
  if (activity.stravaId || activity.source === 'strava') return 'Strava';
  return 'Manuel';
}

export function rpeTone(rpe: number): ChipTone {
  if (rpe <= 3) return 'done';
  if (rpe <= 6) return 'amber';
  if (rpe <= 8) return 'orange';
  return 'red';
}

export function toHeroActivity(activity: ActivityDetail): HeroActivity {
  return {
    type: activity.type,
    duration: activity.duration,
    runMetrics: activity.runMetrics
      ? {
          distanceM: activity.runMetrics.distanceM,
          paceSecPerKm: activity.runMetrics.paceSecPerKm,
          avgHr: activity.runMetrics.avgHr,
          cadence: activity.runMetrics.cadence,
        }
      : null,
    bikeMetrics: activity.bikeMetrics ? { elevationM: activity.bikeMetrics.elevationM } : null,
    swimMetrics: activity.swimMetrics
      ? {
          distanceM: activity.swimMetrics.distanceM,
          avgPaceSecPer100m: activity.swimMetrics.avgPaceSecPer100m,
        }
      : null,
  };
}

export function buildStrengthStats(activity: ActivityDetail): ActivityStat[] {
  if (activity.type !== ActivityType.STRENGTH) return [];
  const sets = activity.strengthSets;
  if (sets.length === 0) return [];

  const totalSets = sets.reduce((acc, s) => acc + s.sets, 0);
  const volume = sets.reduce((acc, s) => acc + s.sets * s.reps * (s.weightKg ?? 0), 0);

  const stats: ActivityStat[] = [
    { label: 'Exercices', value: String(sets.length) },
    { label: 'Séries', value: String(totalSets) },
  ];
  if (volume > 0) stats.push({ label: 'Volume', value: `${Math.round(volume)} kg` });
  if (activity.duration != null) {
    stats.push({ label: 'Temps', value: formatDuration(activity.duration) });
  }

  return stats;
}

export function buildActivitySpecs(activity: ActivityDetail): ActivitySpec[] {
  const specs: ActivitySpec[] = [];
  const push = (label: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return;
    specs.push({ label, value });
  };

  if (activity.type === ActivityType.RUN && activity.runMetrics) {
    const m = activity.runMetrics;
    push('Dénivelé', m.elevationM != null ? `${m.elevationM} m` : null);
    push('Puissance moy.', m.avgPower != null ? `${Math.round(m.avgPower)} W` : null);
    push('Chaussures', m.shoes);
  }

  if (activity.type === ActivityType.BIKE && activity.bikeMetrics) {
    const m = activity.bikeMetrics;
    push('FTP %', m.ftpPercent);
    push('NP', m.normalizedPower != null ? `${Math.round(m.normalizedPower)} W` : null);
    push('IF', m.intensityFactor != null ? m.intensityFactor.toFixed(2) : null);
    push('TSS', m.tss != null ? Math.round(m.tss) : null);
    push('Cadence', m.avgCadence != null ? `${m.avgCadence} rpm` : null);
    push('Calories', m.calories);
    push('Vélo', m.bikeName);
  }

  if (activity.type === ActivityType.SWIM && activity.swimMetrics) {
    const m = activity.swimMetrics;
    push('Séries', m.sets);
    push(
      'CSS',
      m.cssSecPer100m != null
        ? `${Math.floor(m.cssSecPer100m / 60)}:${String(Math.round(m.cssSecPer100m % 60)).padStart(
            2,
            '0',
          )}/100m`
        : null,
    );
    push('SWOLF', m.swolf);
    push('Drills', m.drills);
  }

  return specs;
}
