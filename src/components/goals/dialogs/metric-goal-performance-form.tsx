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

export function PerformanceMetricGoalForm({
  uid,
  formId,
  goal,
  sport,
  allowedSports,
  distancePreset,
  customDistanceKm,
  chronoTarget,
  performanceEndMode,
  performanceEndDate,
  customTitle,
  suggestedPerformanceTitle,
  onSportChange,
  onDistancePresetChange,
  onCustomDistanceKmChange,
  onChronoTargetChange,
  onPerformanceEndModeChange,
  onPerformanceEndDateChange,
  onCustomTitleChange,
  onSubmit,
}: {
  uid: string;
  formId: string;
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
  onSportChange: (sport: ActivityType) => void;
  onDistancePresetChange: (preset: string) => void;
  onCustomDistanceKmChange: (value: string) => void;
  onChronoTargetChange: (value: string) => void;
  onPerformanceEndModeChange: (mode: GoalEndMode) => void;
  onPerformanceEndDateChange: (value: string) => void;
  onCustomTitleChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-4" id={formId} onSubmit={onSubmit}>
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

      <PerformanceMetricDistanceFields
        customDistanceKm={customDistanceKm}
        distancePreset={distancePreset}
        sport={sport}
        uid={uid}
        onCustomDistanceKmChange={onCustomDistanceKmChange}
        onDistancePresetChange={onDistancePresetChange}
      />

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
    </form>
  );
}
