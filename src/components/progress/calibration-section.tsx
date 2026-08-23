'use client';

import { PerformanceCalibrationPanel } from '@/components/settings/profile/performance-calibration-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useAthleteProfile } from '@/hooks/use-data';
import { mapAthleteProfileToFormData } from '@/lib/profile/map-athlete-profile';

/**
 * Client-side calibration for the Progress hub.
 *
 * `/settings/calibration` reads the profile on the server and hands the panel
 * its initial values. A tabbed hub cannot await inside a section, so the same
 * panel is fed from the query cache instead — the panel itself is unchanged.
 */
export function CalibrationSection() {
  const profileQuery = useAthleteProfile();

  if (profileQuery.isPending) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  return <PerformanceCalibrationPanel initial={mapAthleteProfileToFormData(profileQuery.data)} />;
}
