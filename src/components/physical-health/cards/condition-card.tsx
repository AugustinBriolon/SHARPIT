'use client';

import { Card, CardHeader } from '@/components/ui/card';
import type { PhysicalHealthConditionCard } from '@/core/presentation/physical-health-view-model';
import { corpsToneFromPhysicalSeverity } from '@/lib/health/health-status';
import { cn } from '@/lib/utils';
import {
  ConditionCardActions,
  ConditionCardHeader,
  ConditionExpandedBody,
  ConditionMetaChips,
} from '@/components/physical-health/cards/condition-card-parts';

export function PhysicalHealthConditionCardView({
  condition,
  compact = false,
  onEditLegacy,
}: {
  condition: PhysicalHealthConditionCard;
  compact?: boolean;
  onEditLegacy?: (legacyNoteId: string) => void;
}) {
  const tone = corpsToneFromPhysicalSeverity(condition.severity);

  return (
    <Card
      className={cn(
        'chip-surface rounded-analysis-lg shadow-none',
        !condition.isActive && 'opacity-75',
      )}
    >
      <CardHeader className="space-y-3 pb-2">
        <ConditionCardHeader condition={condition} tone={tone} />
        <ConditionMetaChips condition={condition} />
      </CardHeader>

      {!compact ? <ConditionExpandedBody condition={condition} /> : null}

      <ConditionCardActions condition={condition} onEditLegacy={onEditLegacy} />
    </Card>
  );
}
