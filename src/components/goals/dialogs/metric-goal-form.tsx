'use client';

import { ActivityType, GoalHorizon } from '@prisma/client';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { activityTypeLabels } from '@/lib/format';
import {
  buildPerformanceGoalFields,
  buildPeriodGoalFields,
  distancePresetsForSport,
  formatChronoSeconds,
  formatDistanceLabel,
  inferPerformanceEndMode,
  measureLabels,
  parseChronoInput,
  parseGoalMetricConfig,
  parseTargetInput,
  performanceEndModeLabels,
  performanceSports,
  periodLabels,
  targetInputFromStored,
  type GoalEndMode,
  type GoalMetricTemplate,
  type GoalPeriod,
  type PeriodMeasure,
} from '@/lib/goals/goal-metric-config';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';

const ALL_SPORTS = 'ALL';

const periodOptions: GoalPeriod[] = ['WEEK', 'MONTH', 'YEAR'];
const measureOptions: PeriodMeasure[] = ['activity_count', 'duration', 'distance', 'elevation'];

const periodSportOptions: (ActivityType | typeof ALL_SPORTS)[] = [
  ALL_SPORTS,
  ActivityType.RUN,
  ActivityType.BIKE,
  ActivityType.SWIM,
  ActivityType.STRENGTH,
  ActivityType.OTHER,
];

function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function measurePlaceholder(measure: PeriodMeasure): string {
  switch (measure) {
    case 'activity_count':
      return '4';
    case 'duration':
      return '6';
    case 'distance':
      return '50';
    case 'elevation':
      return '1500';
  }
}

function measureHint(measure: PeriodMeasure, period: GoalPeriod): string {
  const cadence = periodLabels[period].toLowerCase();
  switch (measure) {
    case 'activity_count':
      return `Nombre de séances ${cadence}`;
    case 'duration':
      return `Heures cumulées ${cadence}`;
    case 'distance':
      return `Kilomètres cumulés ${cadence}`;
    case 'elevation':
      return `Dénivelé positif cumulé ${cadence}`;
  }
}

export interface MetricGoalFormResult {
  title: string;
  horizon: GoalHorizon;
  metricKey: string;
  startValue: number | null;
  currentValue: number | null;
  targetValue: number;
  unit: string;
  lowerIsBetter: boolean;
  notes: string | null;
  targetDate: string | null;
}

interface MetricGoalFormProps {
  template: Exclude<GoalMetricTemplate, never>;
  goal?: GoalForEdit | null;
  onError: (message: string | null) => void;
  formId: string;
  onSubmit: (result: MetricGoalFormResult) => void | Promise<void>;
}

export function MetricGoalForm({ template, goal, onError, formId, onSubmit }: MetricGoalFormProps) {
  const existing = useMemo(() => parseGoalMetricConfig(goal?.metricKey), [goal?.metricKey]);

  const [sport, setSport] = useState<ActivityType>(() => {
    if (existing?.template === 'performance') return existing.sport;
    return ActivityType.RUN;
  });
  const [distancePreset, setDistancePreset] = useState<string>(() => {
    if (existing?.template !== 'performance') return '5k';
    const presets = distancePresetsForSport(existing.sport);
    const match = presets.find((p) => p.distanceM === existing.distanceM);
    return match?.id ?? 'custom';
  });
  const [customDistanceKm, setCustomDistanceKm] = useState(() => {
    if (existing?.template === 'performance') {
      const presets = distancePresetsForSport(existing.sport);
      const isCustom = !presets.some((p) => p.distanceM === existing.distanceM);
      if (isCustom) return String(existing.distanceM / 1000);
    }
    return '';
  });
  const [chronoTarget, setChronoTarget] = useState(() => {
    if (existing?.template === 'performance' && goal?.targetValue != null) {
      return formatChronoSeconds(goal.targetValue);
    }
    return '';
  });
  const [performanceEndMode, setPerformanceEndMode] = useState<GoalEndMode>(() => {
    if (existing?.template === 'performance') {
      return inferPerformanceEndMode(existing, goal?.targetDate);
    }
    return 'on_achieved';
  });
  const [performanceEndDate, setPerformanceEndDate] = useState(() => {
    if (
      existing?.template === 'performance' &&
      inferPerformanceEndMode(existing, goal?.targetDate) === 'on_date'
    ) {
      return toDateInput(goal?.targetDate);
    }
    return '';
  });

  const [period, setPeriod] = useState<GoalPeriod>(
    existing?.template === 'period' ? existing.period : 'WEEK',
  );
  const [measure, setMeasure] = useState<PeriodMeasure>(
    existing?.template === 'period' ? existing.measure : 'distance',
  );
  const [periodSport, setPeriodSport] = useState<string>(() => {
    if (existing?.template === 'period') {
      return existing.sport ?? ALL_SPORTS;
    }
    return ALL_SPORTS;
  });
  const [periodTarget, setPeriodTarget] = useState(() => {
    if (existing?.template === 'period' && goal?.targetValue != null) {
      return targetInputFromStored(existing.measure, goal.targetValue);
    }
    return '';
  });
  const [periodEndDate, setPeriodEndDate] = useState(() => toDateInput(goal?.targetDate));
  const [customTitle, setCustomTitle] = useState(goal?.title ?? '');

  const presets = distancePresetsForSport(sport);

  const distancePresetLabel =
    distancePreset === 'custom'
      ? 'Personnalisée'
      : (presets.find((p) => p.id === distancePreset)?.label ?? 'Choisir une distance');

  const periodSportLabel =
    periodSport === ALL_SPORTS ? 'Tous sports' : activityTypeLabels[periodSport as ActivityType];

  function resolveDistanceM(): number | null {
    if (distancePreset === 'custom') {
      const km = Number(customDistanceKm.replace(',', '.'));
      if (!Number.isFinite(km) || km <= 0) return null;
      return Math.round(km * 1000);
    }
    const preset = presets.find((p) => p.id === distancePreset);
    return preset?.distanceM ?? null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onError(null);
    const notes = (new FormData(e.currentTarget).get('notes') as string)?.trim() || null;

    if (template === 'performance') {
      const distanceM = resolveDistanceM();
      const targetSeconds = parseChronoInput(chronoTarget);
      if (!distanceM) {
        onError('Choisis une distance valide.');
        return;
      }
      if (!targetSeconds || targetSeconds <= 0) {
        onError('Saisis un chrono cible (mm:ss ou h:mm:ss).');
        return;
      }
      if (performanceEndMode === 'on_date' && !performanceEndDate) {
        onError('Choisis une date limite.');
        return;
      }
      const fields = buildPerformanceGoalFields(
        { v: 1, template: 'performance', sport, distanceM, endMode: performanceEndMode },
        targetSeconds,
        performanceEndMode,
      );
      await onSubmit({
        title: customTitle.trim() || fields.title,
        horizon: fields.horizon,
        metricKey: fields.metricKey,
        startValue: fields.startValue,
        currentValue: fields.currentValue,
        targetValue: fields.targetValue,
        unit: fields.unit,
        lowerIsBetter: fields.lowerIsBetter,
        notes,
        targetDate: performanceEndMode === 'on_date' ? performanceEndDate : null,
      });
      return;
    }

    const target = parseTargetInput(measure, periodTarget);
    if (target == null) {
      onError('Saisis une cible valide.');
      return;
    }
    const fields = buildPeriodGoalFields(
      {
        v: 1,
        template: 'period',
        period,
        measure,
        sport: periodSport === ALL_SPORTS ? null : (periodSport as ActivityType),
      },
      target,
      customTitle,
    );
    await onSubmit({
      title: fields.title,
      horizon: fields.horizon,
      metricKey: fields.metricKey,
      startValue: fields.startValue,
      currentValue: fields.currentValue,
      targetValue: fields.targetValue,
      unit: fields.unit,
      lowerIsBetter: fields.lowerIsBetter,
      notes,
      targetDate: periodEndDate || null,
    });
  }

  const suggestedPerformanceTitle = useMemo(() => {
    const distanceM = resolveDistanceM();
    const targetSeconds = parseChronoInput(chronoTarget);
    if (!distanceM || !targetSeconds) return '';
    return `${formatDistanceLabel(distanceM)} en ${formatChronoSeconds(targetSeconds)}`;
  }, [chronoTarget, customDistanceKm, distancePreset, sport]);

  if (template === 'performance') {
    return (
      <form className="space-y-4" id={formId} onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Sport</Label>
          <Select
            value={sport}
            onValueChange={(v) => {
              if (!v) return;
              const next = v as ActivityType;
              setSport(next);
              const nextPresets = distancePresetsForSport(next);
              setDistancePreset(nextPresets[0]?.id ?? 'custom');
            }}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue>{activityTypeLabels[sport]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {performanceSports.map((t) => (
                <SelectItem key={t} value={t}>
                  {activityTypeLabels[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Distance</Label>
          <Select value={distancePreset} onValueChange={(v) => v && setDistancePreset(v)}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue>{distancePresetLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Personnalisée</SelectItem>
            </SelectContent>
          </Select>
          {distancePreset === 'custom' && (
            <Input
              inputMode="decimal"
              placeholder="Distance en km"
              value={customDistanceKm}
              onChange={(e) => setCustomDistanceKm(e.target.value)}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="chronoTarget">Temps cible</Label>
          <Input
            id="chronoTarget"
            placeholder="25:00 ou 1:30:00"
            value={chronoTarget}
            required
            onChange={(e) => setChronoTarget(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            Format mm:ss ou h:mm:ss. La progression suit ton meilleur temps sur cette distance.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Fin de l&apos;objectif</Label>
          <Select
            value={performanceEndMode}
            onValueChange={(v) => v && setPerformanceEndMode(v as GoalEndMode)}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue>{performanceEndModeLabels[performanceEndMode]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="on_achieved">{performanceEndModeLabels.on_achieved}</SelectItem>
              <SelectItem value="on_date">{performanceEndModeLabels.on_date}</SelectItem>
            </SelectContent>
          </Select>
          {performanceEndMode === 'on_date' && (
            <Input
              type="date"
              value={performanceEndDate}
              required
              onChange={(e) => setPerformanceEndDate(e.target.value)}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Titre</Label>
          <Input
            id="title"
            placeholder={suggestedPerformanceTitle || '5 km en 25:00'}
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea defaultValue={goal?.notes ?? ''} id="notes" name="notes" rows={2} />
        </div>
      </form>
    );
  }

  return (
    <form className="space-y-4" id={formId} onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label>Récurrence</Label>
        <Select value={period} onValueChange={(v) => v && setPeriod(v as GoalPeriod)}>
          <SelectTrigger className="w-full min-w-0">
            <SelectValue>{periodLabels[period]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {periodLabels[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Mesure</Label>
          <Select value={measure} onValueChange={(v) => v && setMeasure(v as PeriodMeasure)}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue>{measureLabels[measure]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {measureOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {measureLabels[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Sport</Label>
          <Select value={periodSport} onValueChange={(v) => v && setPeriodSport(v)}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue>{periodSportLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {periodSportOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === ALL_SPORTS ? 'Tous sports' : activityTypeLabels[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="periodTarget">Cible</Label>
        <Input
          id="periodTarget"
          inputMode="decimal"
          placeholder={measurePlaceholder(measure)}
          value={periodTarget}
          required
          onChange={(e) => setPeriodTarget(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">{measureHint(measure, period)}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="periodEndDate">Date de fin (optionnel)</Label>
        <Input
          id="periodEndDate"
          type="date"
          value={periodEndDate}
          onChange={(e) => setPeriodEndDate(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Laisse vide pour un objectif sans limite. Sinon, il s&apos;arrête après cette date.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Titre (optionnel)</Label>
        <Input
          id="title"
          placeholder="Laisser vide pour un titre automatique"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea defaultValue={goal?.notes ?? ''} id="notes" name="notes" rows={2} />
      </div>
    </form>
  );
}
