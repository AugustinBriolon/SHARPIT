'use client';

import type { PhysicalHealthViewModel } from '@/core/presentation/physical-health-view-model';
import {
  PhysicalHealthActiveSection,
  PhysicalHealthEmptySection,
  PhysicalHealthLoadingSection,
  PhysicalHealthResolvedSection,
} from '@/components/physical-health/physical-health-page-sections';

export function PhysicalHealthConditionSections({
  embedded,
  loading,
  viewModel,
  onEditLegacy,
}: {
  embedded: boolean;
  loading: boolean;
  viewModel: PhysicalHealthViewModel;
  onEditLegacy: (legacyNoteId: string) => void;
}) {
  if (loading) {
    return <PhysicalHealthLoadingSection />;
  }

  const { activeConditions, resolvedConditions } = viewModel;
  const hasAny = activeConditions.length > 0 || resolvedConditions.length > 0;

  return (
    <>
      {!hasAny && viewModel.emptyState ? (
        <PhysicalHealthEmptySection emptyState={viewModel.emptyState} />
      ) : null}
      <PhysicalHealthActiveSection
        conditions={activeConditions}
        embedded={embedded}
        onEditLegacy={onEditLegacy}
      />
      <PhysicalHealthResolvedSection conditions={resolvedConditions} onEditLegacy={onEditLegacy} />
    </>
  );
}
