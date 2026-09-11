'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useGoals } from '@/hooks/use-data';
import { usePlanHubModel } from '@/hooks/use-plan-hub-model';
import { PlanCoachMenuDropdown } from '@/components/plan/hub/plan-coach-menu-dropdown';
import type { PlanCoachStepId } from '@/lib/plan/hub/plan-coach-offer';

const MacroPlanDialog = dynamic(
  () =>
    import('@/components/planning/overlays/macro-plan-dialog').then((mod) => mod.MacroPlanDialog),
  { ssr: false },
);

const PlanGenerator = dynamic(
  () => import('@/components/coach/plan/plan-generator').then((mod) => mod.PlanGenerator),
  { ssr: false },
);

const PlanAdapter = dynamic(
  () => import('@/components/coach/plan/plan-adapter').then((mod) => mod.PlanAdapter),
  { ssr: false },
);

type CoachOverlay = PlanCoachStepId | null;

function PlanCoachOverlays({
  goals,
  overlay,
  onClose,
}: {
  goals: ReturnType<typeof useGoals>['data'];
  overlay: CoachOverlay;
  onClose: () => void;
}) {
  if (overlay === 'cadre') {
    return <MacroPlanDialog goals={goals ?? []} onClose={onClose} />;
  }
  if (overlay === 'remplir') {
    return <PlanGenerator onClose={onClose} />;
  }
  if (overlay === 'ajuster') {
    return <PlanAdapter onClose={onClose} />;
  }
  return null;
}

/**
 * Quiet Plan hub overflow — same weight as activity ··· menus.
 * No group title, no two-line blurbs. Opens dialogs in place.
 */
export function PlanCoachMenu({ className }: { className?: string }) {
  const goalsQuery = useGoals();
  const { calibration } = usePlanHubModel();
  const [overlay, setOverlay] = useState<CoachOverlay>(null);

  return (
    <>
      <PlanCoachMenuDropdown
        calibration={Boolean(calibration)}
        className={className}
        onOpenOverlay={setOverlay}
      />
      <PlanCoachOverlays
        goals={goalsQuery.data}
        overlay={overlay}
        onClose={() => setOverlay(null)}
      />
    </>
  );
}
