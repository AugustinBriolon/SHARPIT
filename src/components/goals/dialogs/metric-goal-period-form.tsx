'use client';

import { ActivityType } from '@prisma/client';
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
  measureLabels,
  periodLabels,
  type GoalPeriod,
  type PeriodMeasure,
} from '@/lib/goals/goal-metric-config';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';
import type { PeriodSportOption } from '@/lib/practiced-sports';

const ALL_SPORTS = 'ALL';
const periodOptions: GoalPeriod[] = ['WEEK', 'MONTH', 'YEAR'];
const measureOptions: PeriodMeasure[] = ['activity_count', 'duration', 'distance', 'elevation'];
const defaultPeriodSportOptions: PeriodSportOption[] = [
  ALL_SPORTS,
  ActivityType.RUN,
  ActivityType.BIKE,
  ActivityType.SWIM,
  ActivityType.STRENGTH,
  ActivityType.OTHER,
];

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

function PeriodMetricOptionalFields({
  goal,
  periodEndDate,
  customTitle,
  onPeriodEndDateChange,
  onCustomTitleChange,
}: {
  goal?: GoalForEdit | null;
  periodEndDate: string;
  customTitle: string;
  onPeriodEndDateChange: (value: string) => void;
  onCustomTitleChange: (value: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="periodEndDate">Date de fin (optionnel)</Label>
        <Input
          id="periodEndDate"
          type="date"
          value={periodEndDate}
          onChange={(e) => onPeriodEndDateChange(e.target.value)}
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
          onChange={(e) => onCustomTitleChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea defaultValue={goal?.notes ?? ''} id="notes" name="notes" rows={2} />
      </div>
    </>
  );
}

function PeriodRecurrenceField({
  uid,
  period,
  onPeriodChange,
}: {
  uid: string;
  period: GoalPeriod;
  onPeriodChange: (period: GoalPeriod) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`${uid}-period`}>Récurrence</Label>
      <Select value={period} onValueChange={(v) => v && onPeriodChange(v as GoalPeriod)}>
        <SelectTrigger className="w-full min-w-0" id={`${uid}-period`}>
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
  );
}

function PeriodMeasureField({
  uid,
  measure,
  onMeasureChange,
}: {
  uid: string;
  measure: PeriodMeasure;
  onMeasureChange: (measure: PeriodMeasure) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`${uid}-measure`}>Mesure</Label>
      <Select value={measure} onValueChange={(v) => v && onMeasureChange(v as PeriodMeasure)}>
        <SelectTrigger className="w-full min-w-0" id={`${uid}-measure`}>
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
  );
}

function PeriodSportField({
  uid,
  periodSport,
  periodSportLabel,
  allowedSports,
  onPeriodSportChange,
}: {
  uid: string;
  periodSport: string;
  periodSportLabel: string;
  allowedSports: readonly PeriodSportOption[];
  onPeriodSportChange: (sport: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`${uid}-period-sport`}>Sport</Label>
      <Select value={periodSport} onValueChange={(v) => v && onPeriodSportChange(v)}>
        <SelectTrigger className="w-full min-w-0" id={`${uid}-period-sport`}>
          <SelectValue>{periodSportLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowedSports.map((t) => (
            <SelectItem key={t} value={t}>
              {t === ALL_SPORTS ? 'Tous sports' : activityTypeLabels[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PeriodMeasureSportFields({
  uid,
  measure,
  periodSport,
  periodSportLabel,
  allowedSports,
  onMeasureChange,
  onPeriodSportChange,
}: {
  uid: string;
  measure: PeriodMeasure;
  periodSport: string;
  periodSportLabel: string;
  allowedSports: readonly PeriodSportOption[];
  onMeasureChange: (measure: PeriodMeasure) => void;
  onPeriodSportChange: (sport: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <PeriodMeasureField measure={measure} uid={uid} onMeasureChange={onMeasureChange} />
      <PeriodSportField
        allowedSports={allowedSports}
        periodSport={periodSport}
        periodSportLabel={periodSportLabel}
        uid={uid}
        onPeriodSportChange={onPeriodSportChange}
      />
    </div>
  );
}

function PeriodTargetField({
  measure,
  period,
  periodTarget,
  onPeriodTargetChange,
}: {
  measure: PeriodMeasure;
  period: GoalPeriod;
  periodTarget: string;
  onPeriodTargetChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="periodTarget">Cible</Label>
      <Input
        id="periodTarget"
        inputMode="decimal"
        placeholder={measurePlaceholder(measure)}
        value={periodTarget}
        required
        onChange={(e) => onPeriodTargetChange(e.target.value)}
      />
      <p className="text-muted-foreground text-xs">{measureHint(measure, period)}</p>
    </div>
  );
}

export type PeriodMetricGoalFormProps = {
  uid: string;
  formId: string;
  goal?: GoalForEdit | null;
  period: GoalPeriod;
  measure: PeriodMeasure;
  periodSport: string;
  periodTarget: string;
  periodEndDate: string;
  customTitle: string;
  allowedSports?: readonly PeriodSportOption[];
  compact?: boolean;
  onPeriodChange: (period: GoalPeriod) => void;
  onMeasureChange: (measure: PeriodMeasure) => void;
  onPeriodSportChange: (sport: string) => void;
  onPeriodTargetChange: (value: string) => void;
  onPeriodEndDateChange: (value: string) => void;
  onCustomTitleChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

function renderPeriodOptionalFields(props: Omit<PeriodMetricGoalFormProps, 'formId' | 'onSubmit'>) {
  if (props.compact) {
    return null;
  }
  return (
    <PeriodMetricOptionalFields
      customTitle={props.customTitle}
      goal={props.goal}
      periodEndDate={props.periodEndDate}
      onCustomTitleChange={props.onCustomTitleChange}
      onPeriodEndDateChange={props.onPeriodEndDateChange}
    />
  );
}

function PeriodMetricGoalFormFields(props: Omit<PeriodMetricGoalFormProps, 'formId' | 'onSubmit'>) {
  const periodSportLabel =
    props.periodSport === ALL_SPORTS
      ? 'Tous sports'
      : activityTypeLabels[props.periodSport as ActivityType];

  return (
    <>
      <PeriodRecurrenceField
        period={props.period}
        uid={props.uid}
        onPeriodChange={props.onPeriodChange}
      />
      <PeriodMeasureSportFields
        allowedSports={props.allowedSports ?? defaultPeriodSportOptions}
        measure={props.measure}
        periodSport={props.periodSport}
        periodSportLabel={periodSportLabel}
        uid={props.uid}
        onMeasureChange={props.onMeasureChange}
        onPeriodSportChange={props.onPeriodSportChange}
      />
      <PeriodTargetField
        measure={props.measure}
        period={props.period}
        periodTarget={props.periodTarget}
        onPeriodTargetChange={props.onPeriodTargetChange}
      />
      {renderPeriodOptionalFields(props)}
    </>
  );
}

export function PeriodMetricGoalForm({ formId, onSubmit, ...fields }: PeriodMetricGoalFormProps) {
  return (
    <form className="space-y-4" id={formId} onSubmit={onSubmit}>
      <PeriodMetricGoalFormFields {...fields} />
    </form>
  );
}
