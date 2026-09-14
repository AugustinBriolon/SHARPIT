'use client';

import { PlanAdaptAppliedPanel } from '@/components/plan/adapt-applied-panel';
import { GoalAdvancementPanel } from '@/components/today/rich/goal-advancement-panel';
import { TodayRearrangeProposal } from '@/components/today/rich/today-rearrange-proposal';
import { useAdaptAppliedSettled } from '@/hooks/use-adapt-applied-settled';
import { useGoalAdvancement } from '@/hooks/use-goal-advancement';
import type { TodayViewModel } from '@/core/presentation/today-view-model';

/**
 * Which of the three mutually exclusive states the slot is in, resolved before
 * the component branches so the widget stays one decision rather than three.
 */
function planVivantPhase(loading: boolean, settled: boolean): 'idle' | 'applied' | 'proposal' {
  if (loading) {
    return 'idle';
  }
  return settled ? 'applied' : 'proposal';
}

/**
 * Single Plan vivant widget — rearrange xor after-apply xor suivi-only.
 *
 * It heads the widget group rather than sitting inside « Actions du jour »:
 * a trajectory toward a goal weeks out is not one of the day's actions, and a
 * shared bounded region makes it read as one (law of common region).
 *
 * Owns its own state so the slot can mount anywhere on Today without the action
 * row having to derive and forward it.
 */
export function TodayPlanVivantSlot({ vm, loading }: { vm: TodayViewModel; loading: boolean }) {
  const { adaptAck, settled } = useAdaptAppliedSettled();
  const { view, pending } = useGoalAdvancement();

  const suivi = pending ? null : view;
  const phase = planVivantPhase(loading, settled);

  if (phase === 'applied' && adaptAck) {
    return <PlanAdaptAppliedPanel ack={adaptAck} advancement={suivi} />;
  }
  if (phase === 'proposal' && vm.rearrangeProposal) {
    return <TodayRearrangeProposal advancement={suivi} proposal={vm.rearrangeProposal} />;
  }
  if (suivi) {
    return <GoalAdvancementPanel view={suivi} />;
  }
  return null;
}
