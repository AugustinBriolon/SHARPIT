'use client';

import {
  ActivityStatusDrawer,
  ActivityStatusTrigger,
  useActivityStatusButtonState,
} from '@/components/shell/activity-status-button-parts';

/**
 * Athlete activity mode — Today (`/`) only.
 * Draft commits automatically on every meaningful change (no explicit save).
 * Sync from store only when the drawer opens, so auto-save does not collapse panels.
 */
export function ActivityStatusButton({ className }: { className?: string }) {
  const state = useActivityStatusButtonState();

  return (
    <>
      <ActivityStatusTrigger
        className={className}
        open={state.open}
        status={state.store.status}
        onOpen={() => state.setOpen(true)}
      />
      <ActivityStatusDrawer
        draftStatus={state.draftStatus}
        linkedTravel={state.linkedTravel}
        open={state.open}
        retentionKind={state.retentionKind}
        retentionOpen={state.retentionOpen}
        retentionRegionId={state.retentionRegionId}
        travelId={state.travelId}
        travelOpen={state.travelOpen}
        travels={state.travels}
        travelsPending={state.travelsPending}
        untilDate={state.untilDate}
        onOpenChange={state.setOpen}
        onPickStatus={state.onPickStatus}
        onPickTravel={state.onPickTravel}
        onPickUntilDate={state.onPickUntilDate}
        onPickUntilModified={state.onPickUntilModified}
        onToggleRetention={state.toggleRetention}
        onToggleTravel={state.toggleTravel}
        onUntilDateChange={state.setUntilDate}
      />
    </>
  );
}
