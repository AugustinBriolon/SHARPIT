import { notFound } from 'next/navigation';
import { ActivityHeroStats, type HeroActivity } from '@/components/training/activity-hero-stats';
import { ActivityInsights } from '@/components/training/activity-insights';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { DeleteActivityButton } from '@/components/training/activity-list';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/link-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { activityTypeLabels, formatDate, formatDuration } from '@/lib/format';
import { getActivityById } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { ActivityType } from '@prisma/client';
import {
  Bike,
  CloudSun,
  Dumbbell,
  Footprints,
  Gauge,
  Smile,
  Waves,
  type LucideIcon,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

type Stat = { label: string; value: string };
type Spec = { label: string; value: string | number };
type ChipTone = 'neutral' | 'emerald' | 'amber' | 'orange' | 'red';

type Activity = NonNullable<Awaited<ReturnType<typeof getActivityById>>>;

const sportIcon: Record<ActivityType, LucideIcon> = {
  RUN: Footprints,
  BIKE: Bike,
  SWIM: Waves,
  STRENGTH: Dumbbell,
};

const sportIconWrap: Record<ActivityType, string> = {
  RUN: 'bg-orange-500/10 text-orange-600',
  BIKE: 'bg-emerald-500/10 text-emerald-600',
  SWIM: 'bg-blue-500/10 text-blue-600',
  STRENGTH: 'bg-violet-500/10 text-violet-600',
};

const chipDot: Record<ChipTone, string> = {
  neutral: 'bg-muted-foreground',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
};

function activitySourceLabel(activity: {
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

function rpeTone(rpe: number): ChipTone {
  if (rpe <= 3) return 'emerald';
  if (rpe <= 6) return 'amber';
  if (rpe <= 8) return 'orange';
  return 'red';
}

export default async function ActivityDetailPage({ params }: PageProps) {
  const { id } = await params;
  const activity = await getActivityById(id);

  if (!activity) notFound();

  const Icon = sportIcon[activity.type];

  const heroActivity: HeroActivity = {
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

  const strengthStats = buildStrengthStats(activity);
  const specs = buildSpecs(activity);
  const isStrength = activity.type === ActivityType.STRENGTH;

  return (
    <div className="space-y-8">
      <MobileBackLink href="/seances?tab=activites" label="Activités" />
      <StickyHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                'grid size-12 shrink-0 place-items-center rounded-2xl',
                sportIconWrap[activity.type],
              )}
            >
              <Icon className="size-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{activityTypeLabels[activity.type]}</Badge>
                <span className="text-muted-foreground text-sm">
                  {formatDate(new Date(activity.date))}
                </span>
                <span className="text-muted-foreground/70 text-xs tracking-wider uppercase">
                  · {activitySourceLabel(activity)}
                </span>
              </div>
              <h1 className="font-heading mt-2 text-3xl font-semibold">
                {activity.title ?? activityTypeLabels[activity.type]}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm">
                <span className="text-foreground/80">{formatDuration(activity.duration)}</span>
                {activity.load != null && (
                  <span className="text-primary">· {Math.round(activity.load)} TSS</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <LinkButton href={`/training/${activity.id}/edit`} variant="outline">
              Modifier
            </LinkButton>
            <DeleteActivityButton id={activity.id} />
          </div>
        </div>
      </StickyHeader>

      <div className="space-y-5">
        <ContextChips activity={activity} />

        {isStrength ? (
          strengthStats.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {strengthStats.map((stat) => (
                <HeroStat key={stat.label} {...stat} />
              ))}
            </div>
          )
        ) : (
          <ActivityHeroStats activity={heroActivity} activityId={activity.id} />
        )}
      </div>

      {!isStrength && <ActivityInsights activityId={activity.id} type={activity.type} />}

      {isStrength && <StrengthExercises activity={activity} />}

      {(specs.length > 0 || activity.notes) && (
        <section className="grid gap-4 lg:grid-cols-3">
          {specs.length > 0 && (
            <Card className={cn(activity.notes ? 'lg:col-span-2' : 'lg:col-span-3')}>
              <CardHeader>
                <CardTitle className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
                  Caractéristiques
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                {specs.map((row) => (
                  <div
                    key={row.label}
                    className="border-border/40 flex justify-between gap-4 border-b py-2 last:border-0 sm:[&:nth-last-child(2)]:border-0"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="text-right font-medium">{row.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {activity.notes && (
            <Card className={cn(specs.length === 0 && 'lg:col-span-3')}>
              <CardHeader>
                <CardTitle className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
                  {activity.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}

function ContextChips({ activity }: { activity: Activity }) {
  const chips: React.ReactNode[] = [];

  if (activity.rpe != null) {
    chips.push(
      <Chip
        key="rpe"
        icon={Gauge}
        label="RPE"
        tone={rpeTone(activity.rpe)}
        value={`${activity.rpe}/10`}
      />,
    );
  }
  if (activity.feeling) {
    chips.push(<Chip key="feeling" icon={Smile} label="Ressenti" value={activity.feeling} />);
  }
  if (activity.weather) {
    chips.push(<Chip key="weather" icon={CloudSun} label="Météo" value={activity.weather} />);
  }

  if (chips.length === 0) return null;
  return <div className="flex flex-wrap gap-2">{chips}</div>;
}

function Chip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: ChipTone;
}) {
  return (
    <span className="border-border bg-card inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs">
      {tone ? (
        <span className={cn('size-2 rounded-full', chipDot[tone])} />
      ) : (
        <Icon className="text-muted-foreground size-3.5" />
      )}
      <span className="text-muted-foreground font-medium tracking-wider uppercase">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </span>
  );
}

function HeroStat({ label, value }: Stat) {
  return (
    <div className="border-border bg-card rounded-2xl border px-5 py-4">
      <p className="text-muted-foreground text-[11px] font-medium uppercase">{label}</p>
      <p className="text-foreground mt-1.5 font-mono text-3xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function StrengthExercises({ activity }: { activity: Activity }) {
  const sets = activity.strengthSets;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
          <Dumbbell className="size-4 text-violet-600" />
          Exercices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sets.length > 0 ? (
          sets.map((set, i) => {
            const volume = set.sets * set.reps * (set.weightKg ?? 0);
            return (
              <div
                key={set.id}
                className="border-border/60 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-violet-500/10 font-mono text-xs font-semibold text-violet-600">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 font-medium">
                  {set.exercise}
                  {set.notes && (
                    <span className="text-muted-foreground block truncate text-xs font-normal">
                      {set.notes}
                    </span>
                  )}
                </span>
                <span className="font-mono text-sm tabular-nums">
                  {set.sets}×{set.reps}
                  {set.weightKg ? ` @ ${set.weightKg} kg` : ''}
                </span>
                <span className="text-muted-foreground flex items-center gap-2 text-xs">
                  {volume > 0 && <span className="font-mono">{Math.round(volume)} kg</span>}
                  {set.rpe != null && (
                    <span className="border-border rounded-full border px-2 py-0.5 font-mono">
                      RPE {set.rpe}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        ) : (
          <p className="text-muted-foreground text-sm">
            Aucun exercice enregistré pour cette séance.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function buildStrengthStats(activity: Activity): Stat[] {
  if (activity.type !== ActivityType.STRENGTH) return [];
  const sets = activity.strengthSets;
  if (sets.length === 0) return [];

  const totalSets = sets.reduce((acc, s) => acc + s.sets, 0);
  const volume = sets.reduce((acc, s) => acc + s.sets * s.reps * (s.weightKg ?? 0), 0);

  const stats: Stat[] = [
    { label: 'Exercices', value: String(sets.length) },
    { label: 'Séries', value: String(totalSets) },
  ];
  if (volume > 0) stats.push({ label: 'Volume', value: `${Math.round(volume)} kg` });
  if (activity.duration != null)
    stats.push({ label: 'Temps', value: formatDuration(activity.duration) });

  return stats;
}

function buildSpecs(activity: Activity): Spec[] {
  const specs: Spec[] = [];
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
