import { DiscussWithCoachButton } from '@/components/coach/discuss-with-coach-button';
import { LinkButton } from '@/components/ui/link-button';
import { MOI_CALIBRATION_PATH } from '@/lib/moi/paths';
import type { CalibrationConfidence } from '@/lib/plan/plan-calibration-confidence';

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
  );
}
