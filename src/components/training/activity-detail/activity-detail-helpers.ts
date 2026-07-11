import type { HeroActivity } from '@/components/training/activity-hero-stats';
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

export const sportIconWrap: Record<ActivityType, string> = {
  RUN: 'bg-orange-500/10 text-orange-600',
  BIKE: 'bg-emerald-500/10 text-emerald-600',
  SWIM: 'bg-blue-500/10 text-blue-600',
  STRENGTH: 'bg-violet-500/10 text-violet-600',
  TRIATHLON: 'bg-fuchsia-500/10 text-fuchsia-600',
  OTHER: 'bg-slate-500/10 text-slate-600',
};

export const chipDot: Record<ChipTone, string> = {
  neutral: 'bg-muted-foreground',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
};

export const chipLinkSurface: Record<ChipTone, string> = {
  neutral: 'border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40',
  emerald:
    'border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/50 hover:bg-emerald-500/15',
  amber: 'border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50 hover:bg-amber-500/15',
  orange: 'border-orange-500/30 bg-orange-500/10 hover:border-orange-500/50 hover:bg-orange-500/15',
  red: 'border-red-500/30 bg-red-500/10 hover:border-red-500/50 hover:bg-red-500/15',
};

export const chipStaticSurface: Record<ChipTone, string> = {
  neutral: 'border-border bg-card',
  emerald: 'border-emerald-500/30 bg-emerald-500/10',
  amber: 'border-amber-500/30 bg-amber-500/10',
  orange: 'border-orange-500/30 bg-orange-500/10',
  red: 'border-red-500/30 bg-red-500/10',
};

export const chipIconTone: Record<ChipTone, string> = {
  neutral: 'text-muted-foreground',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  orange: 'text-orange-600',
  red: 'text-red-600',
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
  if (rpe <= 3) return 'emerald';
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
