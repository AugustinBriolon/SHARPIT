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
import { type GoalEndMode } from '@/lib/goals/goal-metric-config';
import {
  PerformanceMetricDistanceFields,
  PerformanceMetricEndModeField,
} from '@/components/goals/dialogs/metric-goal-performance-fields';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';

function PerformanceSportField({
  uid,
  sport,
  allowedSports,
  onSportChange,
}: {
  uid: string;
  sport: ActivityType;
  allowedSports: readonly ActivityType[];
  onSportChange: (sport: ActivityType) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`${uid}-sport`}>Sport</Label>
      <Select value={sport} onValueChange={(v) => v && onSportChange(v as ActivityType)}>
        <SelectTrigger className="w-full min-w-0" id={`${uid}-sport`}>
          <SelectValue>{activityTypeLabels[sport]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowedSports.map((t) => (
            <SelectItem key={t} value={t}>
              {activityTypeLabels[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PerformanceOptionalFields({
  uid,
  goal,
  performanceEndMode,
  performanceEndDate,
  customTitle,
  suggestedPerformanceTitle,
  onPerformanceEndModeChange,
  onPerformanceEndDateChange,
  onCustomTitleChange,
}: {
  uid: string;
  goal?: GoalForEdit | null;
  performanceEndMode: GoalEndMode;
  performanceEndDate: string;
  customTitle: string;
  suggestedPerformanceTitle: string;
  onPerformanceEndModeChange: (mode: GoalEndMode) => void;
  onPerformanceEndDateChange: (value: string) => void;
  onCustomTitleChange: (value: string) => void;
}) {
  return (
    <>
      <PerformanceMetricEndModeField
        performanceEndDate={performanceEndDate}
        performanceEndMode={performanceEndMode}
        uid={uid}
        onPerformanceEndDateChange={onPerformanceEndDateChange}
        onPerformanceEndModeChange={onPerformanceEndModeChange}
      />

      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          placeholder={suggestedPerformanceTitle || '5 km en 25:00'}
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

function PerformanceChronoTargetField({
  chronoTarget,
  onChronoTargetChange,
}: {
  chronoTarget: string;
  onChronoTargetChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="chronoTarget">Temps cible</Label>
      <Input
        id="chronoTarget"
        placeholder="25:00 ou 1:30:00"
        value={chronoTarget}
        required
        onChange={(e) => onChronoTargetChange(e.target.value)}
      />
      <p className="text-muted-foreground text-xs">
        Format mm:ss ou h:mm:ss. La progression suit ton meilleur temps sur cette distance.
      </p>
    </div>
  );
}

type PerformanceMetricGoalFormBodyProps = {
  uid: string;
  goal?: GoalForEdit | null;
  sport: ActivityType;
  allowedSports: readonly ActivityType[];
  distancePreset: string;
  customDistanceKm: string;
  chronoTarget: string;
  performanceEndMode: GoalEndMode;
  performanceEndDate: string;
  customTitle: string;
  suggestedPerformanceTitle: string;
  compact?: boolean;
  onSportChange: (sport: ActivityType) => void;
  onDistancePresetChange: (preset: string) => void;
  onCustomDistanceKmChange: (value: string) => void;
  onChronoTargetChange: (value: string) => void;
  onPerformanceEndModeChange: (mode: GoalEndMode) => void;
  onPerformanceEndDateChange: (value: string) => void;
  onCustomTitleChange: (value: string) => void;
};

function PerformanceMetricSportSection({
  uid,
  sport,
  allowedSports,
  compact,
  onSportChange,
}: Pick<
  PerformanceMetricGoalFormBodyProps,
  'uid' | 'sport' | 'allowedSports' | 'compact' | 'onSportChange'
>) {
  if (compact && allowedSports.length === 1) {
    return null;
  }
  return (
    <PerformanceSportField
      allowedSports={allowedSports}
      sport={sport}
      uid={uid}
      onSportChange={onSportChange}
    />
  );
}

function PerformanceMetricCoreFields(props: PerformanceMetricGoalFormBodyProps) {
  return (
    <>
      <PerformanceMetricSportSection
        allowedSports={props.allowedSports}
        compact={props.compact}
        sport={props.sport}
        uid={props.uid}
        onSportChange={props.onSportChange}
      />
      <PerformanceMetricDistanceFields
        customDistanceKm={props.customDistanceKm}
        distancePreset={props.distancePreset}
        sport={props.sport}
        uid={props.uid}
        onCustomDistanceKmChange={props.onCustomDistanceKmChange}
        onDistancePresetChange={props.onDistancePresetChange}
      />
      <PerformanceChronoTargetField
        chronoTarget={props.chronoTarget}
        onChronoTargetChange={props.onChronoTargetChange}
      />
    </>
  );
}

function PerformanceMetricGoalFormBody(props: PerformanceMetricGoalFormBodyProps) {
  return (
    <>
      <PerformanceMetricCoreFields {...props} />
      {props.compact ? null : (
        <PerformanceOptionalFields
          customTitle={props.customTitle}
          goal={props.goal}
          performanceEndDate={props.performanceEndDate}
          performanceEndMode={props.performanceEndMode}
          suggestedPerformanceTitle={props.suggestedPerformanceTitle}
          uid={props.uid}
          onCustomTitleChange={props.onCustomTitleChange}
          onPerformanceEndDateChange={props.onPerformanceEndDateChange}
          onPerformanceEndModeChange={props.onPerformanceEndModeChange}
        />
      )}
    </>
  );
}

export type PerformanceMetricGoalFormProps = PerformanceMetricGoalFormBodyProps & {
  formId: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function PerformanceMetricGoalForm({
  formId,
  onSubmit,
  ...body
}: PerformanceMetricGoalFormProps) {
  return (
    <form className="space-y-4" id={formId} onSubmit={onSubmit}>
      <PerformanceMetricGoalFormBody {...body} />
    </form>
  );
}
