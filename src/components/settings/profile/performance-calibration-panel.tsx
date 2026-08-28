'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { CalibrationEditor } from '@/components/settings/profile/performance-calibration-editor';
import { usePerformanceCalibration } from '@/components/settings/profile/performance-calibration-hooks';
import type { ProfileData } from '@/components/settings/profile/profile-types';

export function PerformanceCalibrationPanel({ initial }: { initial: ProfileData | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const calibration = usePerformanceCalibration(initial, queryClient, router);

  return (
    <CalibrationEditor
      applyPending={calibration.applyEstimates.isPending}
      canSave={initial !== null}
      dirty={calibration.dirty}
      error={calibration.error}
      ftpW={calibration.ftpW}
      guardDisabled={calibration.guardDisabled}
      hasThresholds={calibration.hasThresholds}
      history={calibration.history}
      importing={calibration.importing}
      lthr={calibration.lthr}
      maxHr={calibration.maxHr}
      message={calibration.message}
      offline={calibration.offline}
      offlineLabel={calibration.offlineLabel}
      poolLength={calibration.poolLength}
      preview={calibration.preview}
      saving={calibration.saving}
      swimCss={calibration.swimCss}
      syncedLabel={calibration.syncedLabel}
      thresholdPace={calibration.thresholdPace}
      vo2maxCycling={calibration.vo2maxCycling}
      vo2maxRunning={calibration.vo2maxRunning}
      onApplyEstimates={calibration.handleApplyEstimates}
      onFtpW={calibration.setFtpW}
      onGarminImport={calibration.handleGarminImport}
      onLthr={calibration.setLthr}
      onMaxHr={calibration.setMaxHr}
      onPoolLength={calibration.setPoolLength}
      onSubmit={calibration.handleSubmit}
      onSwimCss={calibration.setSwimCss}
      onThresholdPace={calibration.setThresholdPace}
    />
  );
}
