'use client';

import { PersonalProfilePanel } from '@/components/settings/profile/personal-profile-panel';
import { PerformanceCalibrationPanel } from '@/components/settings/profile/performance-calibration-panel';
import type { ProfileData } from '@/components/settings/profile/profile-types';

export function AthleteProfilePanel({ initial }: { initial: ProfileData | null }) {
  return (
    <div className="space-y-8">
      <PersonalProfilePanel initial={initial} />
      <PerformanceCalibrationPanel initial={initial} />
    </div>
  );
}
