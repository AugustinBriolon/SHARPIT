'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { DiscussWithCoachButton } from '@/components/coach/discuss-with-coach-button';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { useGoals } from '@/hooks/use-data';
import { MOI_CALIBRATION_PATH } from '@/lib/moi/paths';
import type { CalibrationConfidence } from '@/lib/plan/plan-calibration-confidence';

const MacroPlanDialog = dynamic(
  () => import('@/components/planning/macro-plan-dialog').then((mod) => mod.MacroPlanDialog),
  { ssr: false },
);
const WeeklyBrief = dynamic(
  () => import('@/components/coach/weekly-brief').then((mod) => mod.WeeklyBrief),
  { ssr: false },
);

/**
 * Hub footer: brief + macro live here; Remplir/Ajuster stay on /plan/semaine Actions.
 */
export function PlanActions({
  calibration = null,
}: {
  calibration?: CalibrationConfidence | null;
}) {
  const goalsQuery = useGoals();
  const [macroOpen, setMacroOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);

  return (
    <>
      <nav aria-label="Actions plan" className="flex flex-wrap items-center gap-2">
        <Button size="sm" type="button" variant="outline" onClick={() => setBriefOpen(true)}>
          Bilan hebdo
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={() => setMacroOpen(true)}>
          Plan jusqu&apos;à la course
        </Button>
        <LinkButton href="/plan/semaine" size="sm" variant="outline">
          Remplir / ajuster
        </LinkButton>
        {calibration ? (
          <LinkButton href={MOI_CALIBRATION_PATH} size="sm" variant="outline">
            Seuils et repères
          </LinkButton>
        ) : null}
        <DiscussWithCoachButton
          label="Coach"
          size="sm"
          target={{ kind: 'planning', horizonDays: 7 }}
        />
      </nav>
      {briefOpen ? <WeeklyBrief onClose={() => setBriefOpen(false)} /> : null}
      {macroOpen ? (
        <MacroPlanDialog goals={goalsQuery.data ?? []} onClose={() => setMacroOpen(false)} />
      ) : null}
    </>
  );
}
