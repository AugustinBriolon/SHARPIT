import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { coachDiscussHref } from '@/lib/coach/chat/coach-discuss-href';
import { MOI_CALIBRATION_PATH } from '@/lib/moi/paths';
import type { CalibrationConfidence } from '@/lib/plan/plan-calibration-confidence';

const CHIP =
  'chip-surface hover:border-primary/25 focus-visible:ring-primary/35 rounded-analysis inline-flex min-h-10 items-center gap-2 px-3 text-sm focus-visible:ring-2 focus-visible:outline-hidden';

/**
 * Footer actions on the hub: calibration when the ruler is degraded, then Coach.
 */
export function PlanActions({
  calibration = null,
}: {
  calibration?: CalibrationConfidence | null;
}) {
  return (
    <nav aria-label="Actions plan" className="flex flex-wrap items-center gap-2">
      {calibration ? (
        <Link className={CHIP} href={MOI_CALIBRATION_PATH}>
          Seuils et repères
        </Link>
      ) : null}
      <Link className={CHIP} href={coachDiscussHref({ kind: 'planning', horizonDays: 7 })}>
        <MessageCircle className="text-muted-foreground size-3.5" strokeWidth={1.5} aria-hidden />
        Demander au Coach
      </Link>
    </nav>
  );
}
