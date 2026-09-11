'use client';

import Link from 'next/link';
import { CalendarPlus, CalendarRange, MoreHorizontal, SlidersHorizontal } from 'lucide-react';
import { CoachDiscussIcon } from '@/components/coach/discuss/discuss-with-coach-button';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { coachDiscussHref } from '@/lib/coach/chat/discuss/coach-discuss-href';
import { MOI_CALIBRATION_PATH } from '@/lib/moi/paths';
import { PLAN_COACH_INTENTION, type PlanCoachStepId } from '@/lib/plan/hub/plan-coach-offer';
import { cn } from '@/lib/utils';

/** Compact overflow labels — verbs only, no section chrome. */
const MENU_STEPS = [
  { id: 'cadre' as const, label: 'Plan macro', Icon: CalendarRange },
  { id: 'remplir' as const, label: 'Remplir', Icon: CalendarPlus },
  { id: 'ajuster' as const, label: 'Ajuster', Icon: SlidersHorizontal },
] as const;

function PlanCoachMenuItems({
  calibration,
  onOpenOverlay,
}: {
  calibration: boolean;
  onOpenOverlay: (id: PlanCoachStepId) => void;
}) {
  return (
    <>
      {MENU_STEPS.map(({ id, label, Icon }) => (
        <DropdownMenuItem
          key={id}
          className="cursor-pointer gap-2"
          onClick={() => onOpenOverlay(id)}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="cursor-pointer gap-2"
        nativeButton={false}
        render={<Link href={coachDiscussHref({ kind: 'planning', horizonDays: 7 })} />}
      >
        <CoachDiscussIcon className="size-3.5" aria-hidden />
        Discuter
      </DropdownMenuItem>
      {calibration ? (
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          nativeButton={false}
          render={<Link href={MOI_CALIBRATION_PATH} />}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          Seuils
        </DropdownMenuItem>
      ) : null}
    </>
  );
}

export function PlanCoachMenuDropdown({
  calibration,
  className,
  onOpenOverlay,
}: {
  calibration: boolean;
  className?: string;
  onOpenOverlay: (id: PlanCoachStepId) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={PLAN_COACH_INTENTION}
            className={cn('shrink-0', className)}
            size="icon-sm"
            type="button"
            variant="outline"
          />
        }
      >
        <MoreHorizontal className="size-5 lg:size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <PlanCoachMenuItems calibration={calibration} onOpenOverlay={onOpenOverlay} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
