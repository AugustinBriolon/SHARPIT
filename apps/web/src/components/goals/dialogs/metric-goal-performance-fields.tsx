'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  distancePresetsForSport,
  performanceEndModeLabels,
  type GoalEndMode,
} from '@/lib/goals/goal-metric-config';
import { ActivityType } from '@prisma/client';

export function PerformanceMetricDistanceFields({
  uid,
  sport,
  distancePreset,
  customDistanceKm,
  onDistancePresetChange,
  onCustomDistanceKmChange,
}: {
  uid: string;
  sport: ActivityType;
  distancePreset: string;
  customDistanceKm: string;
  onDistancePresetChange: (preset: string) => void;
  onCustomDistanceKmChange: (value: string) => void;
}) {
  const presets = distancePresetsForSport(sport);
  const distancePresetLabel =
    distancePreset === 'custom'
      ? 'Personnalisée'
      : (presets.find((p) => p.id === distancePreset)?.label ?? 'Choisir une distance');

  return (
    <div className="space-y-2">
      <Label htmlFor={`${uid}-distance`}>Distance</Label>
      <Select value={distancePreset} onValueChange={(v) => v && onDistancePresetChange(v)}>
        <SelectTrigger className="w-full min-w-0" id={`${uid}-distance`}>
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
      {distancePreset === 'custom' ? (
        <Input
          inputMode="decimal"
          placeholder="Distance en km"
          value={customDistanceKm}
          onChange={(e) => onCustomDistanceKmChange(e.target.value)}
        />
      ) : null}
    </div>
  );
}

export function PerformanceMetricEndModeField({
  uid,
  performanceEndMode,
  performanceEndDate,
  onPerformanceEndModeChange,
  onPerformanceEndDateChange,
}: {
  uid: string;
  performanceEndMode: GoalEndMode;
  performanceEndDate: string;
  onPerformanceEndModeChange: (mode: GoalEndMode) => void;
  onPerformanceEndDateChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`${uid}-end-mode`}>Fin de l&apos;objectif</Label>
      <Select
        value={performanceEndMode}
        onValueChange={(v) => v && onPerformanceEndModeChange(v as GoalEndMode)}
      >
        <SelectTrigger className="w-full min-w-0" id={`${uid}-end-mode`}>
          <SelectValue>{performanceEndModeLabels[performanceEndMode]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="on_achieved">{performanceEndModeLabels.on_achieved}</SelectItem>
          <SelectItem value="on_date">{performanceEndModeLabels.on_date}</SelectItem>
        </SelectContent>
      </Select>
      {performanceEndMode === 'on_date' ? (
        <Input
          type="date"
          value={performanceEndDate}
          required
          onChange={(e) => onPerformanceEndDateChange(e.target.value)}
        />
      ) : null}
    </div>
  );
}
