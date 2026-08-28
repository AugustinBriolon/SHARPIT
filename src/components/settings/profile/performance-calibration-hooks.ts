import type { QueryClient } from '@tanstack/react-query';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useEffect, useMemo, useState } from 'react';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import { paceToInput } from '@/components/settings/profile/profile-input-format';
import { commitProfileSave, saveProfilePatch } from '@/components/settings/profile/profile-save';
import type { ProfileData } from '@/components/settings/profile/profile-types';
import {
  buildCalibrationPatch,
  calibrationValuesFromProfile,
  profilePaceField,
  profileStringField,
} from '@/components/settings/profile/performance-calibration-form';
import { toast } from '@/components/ui/toast';
import {
  useApplyThresholdEstimates,
  useThresholdHistory,
  useThresholdPreview,
} from '@/hooks/use-data';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { shouldHydrateProfileForm } from '@/lib/profile/map-athlete-profile';
import { invalidateAfterAthleteProfileSave } from '@/lib/query/invalidate-after-athlete-profile-save';
import type { ThresholdField } from '@/lib/threshold/threshold-estimates';

export interface GarminImportResult {
  imported: boolean;
  ftpW: number | null;
  maxHr: number | null;
  lthr: number | null;
  runThresholdPaceSecPerKm: number | null;
  vo2maxRunning: number | null;
  vo2maxCycling: number | null;
  failedSources?: string[];
}

const GARMIN_SOURCE_LABELS: Record<string, string> = {
  'user-settings': 'réglages athlète',
  'heart-rate-zones': 'zones de FC',
  'power-zones': 'zones de puissance',
};

export function describeFailedSources(sources: string[]): string {
  return sources.map((source) => GARMIN_SOURCE_LABELS[source] ?? source).join(', ');
}

function buildGarminImportMessage(data: GarminImportResult): string {
  const failed = data.failedSources ?? [];
  if (!data.imported) {
    if (failed.length > 0) {
      return `Garmin n'a pas répondu pour : ${describeFailedSources(failed)}. Ces seuils sont inconnus, pas absents: réessaie.`;
    }
    return 'Aucun seuil trouvé sur ton compte Garmin.';
  }
  if (failed.length > 0) {
    return `Import partiel : Garmin n'a pas répondu pour ${describeFailedSources(failed)}.`;
  }
  return 'Seuils importés depuis Garmin et enregistrés.';
}

async function fetchGarminImport(): Promise<GarminImportResult> {
  const res = await fetch('/api/athlete-profile/import-garmin', { method: 'POST' });
  const data = (await res.json().catch(() => null)) as
    (GarminImportResult & { error?: string }) | null;
  if (!res.ok || !data) {
    throw new Error(data?.error ?? "Échec de l'import Garmin");
  }
  return data;
}

function useCalibrationFormState(initial: ProfileData | null) {
  const [ftpW, setFtpW] = useState(() => profileStringField(initial?.ftpW));
  const [maxHr, setMaxHr] = useState(() => profileStringField(initial?.maxHr));
  const [lthr, setLthr] = useState(() => profileStringField(initial?.lthr));
  const [thresholdPace, setThresholdPace] = useState(() =>
    profilePaceField(initial?.runThresholdPaceSecPerKm),
  );
  const [swimCss, setSwimCss] = useState(() => profilePaceField(initial?.swimCssSecPer100m));
  const [poolLength, setPoolLength] = useState(() =>
    profileStringField(initial?.defaultPoolLengthM),
  );
  const [vo2maxRunning, setVo2maxRunning] = useState<number | null>(initial?.vo2maxRunning ?? null);
  const [vo2maxCycling, setVo2maxCycling] = useState<number | null>(initial?.vo2maxCycling ?? null);

  useEffect(() => {
    if (!shouldHydrateProfileForm(initial)) {
      return;
    }
    const values = calibrationValuesFromProfile(initial);
    setFtpW(values.ftpW);
    setMaxHr(values.maxHr);
    setLthr(values.lthr);
    setThresholdPace(values.thresholdPace);
    setSwimCss(values.swimCss);
    setPoolLength(values.poolLength);
    setVo2maxRunning(initial.vo2maxRunning ?? null);
    setVo2maxCycling(initial.vo2maxCycling ?? null);
  }, [initial]);

  return {
    ftpW,
    setFtpW,
    maxHr,
    setMaxHr,
    lthr,
    setLthr,
    thresholdPace,
    setThresholdPace,
    swimCss,
    setSwimCss,
    poolLength,
    setPoolLength,
    vo2maxRunning,
    setVo2maxRunning,
    vo2maxCycling,
    setVo2maxCycling,
  };
}

function applyGarminResult(
  data: GarminImportResult,
  setters: ReturnType<typeof useCalibrationFormState>,
) {
  setters.setFtpW(profileStringField(data.ftpW));
  setters.setMaxHr(profileStringField(data.maxHr));
  setters.setLthr(profileStringField(data.lthr));
  setters.setThresholdPace(profilePaceField(data.runThresholdPaceSecPerKm));
  setters.setVo2maxRunning(data.vo2maxRunning);
  setters.setVo2maxCycling(data.vo2maxCycling);
}

function applyEstimateProfile(
  profile: {
    ftpW?: number | null;
    runThresholdPaceSecPerKm?: number | null;
    swimCssSecPer100m?: number | null;
  },
  setters: ReturnType<typeof useCalibrationFormState>,
) {
  if (profile.swimCssSecPer100m !== null && profile.swimCssSecPer100m !== undefined) {
    setters.setSwimCss(paceToInput(profile.swimCssSecPer100m));
  }
  if (profile.ftpW !== null && profile.ftpW !== undefined) {
    setters.setFtpW(String(profile.ftpW));
  }
  if (profile.runThresholdPaceSecPerKm !== null && profile.runThresholdPaceSecPerKm !== undefined) {
    setters.setThresholdPace(paceToInput(profile.runThresholdPaceSecPerKm));
  }
}

async function persistCalibrationPatch(
  initial: ProfileData | null,
  form: ReturnType<typeof useCalibrationFormState>,
  queryClient: QueryClient,
  router: AppRouterInstance,
) {
  const patch = buildCalibrationPatch(initial, {
    ftpW: form.ftpW,
    maxHr: form.maxHr,
    lthr: form.lthr,
    thresholdPace: form.thresholdPace,
    swimCss: form.swimCss,
    poolLength: form.poolLength,
  });

  if (Object.keys(patch).length === 0) {
    return 'empty' as const;
  }

  const previousProfile = saveProfilePatch(queryClient, patch);
  const res = await fetch('/api/athlete-profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  await commitProfileSave(queryClient, router, res, previousProfile);
  return 'saved' as const;
}

function isCalibrationDirty(
  form: ReturnType<typeof useCalibrationFormState>,
  baseline: ReturnType<typeof calibrationValuesFromProfile>,
) {
  return (
    form.ftpW !== baseline.ftpW ||
    form.maxHr !== baseline.maxHr ||
    form.lthr !== baseline.lthr ||
    form.thresholdPace !== baseline.thresholdPace ||
    form.swimCss !== baseline.swimCss ||
    form.poolLength !== baseline.poolLength
  );
}

function hasCalibrationThresholds(form: ReturnType<typeof useCalibrationFormState>) {
  return [form.ftpW, form.maxHr, form.lthr, form.thresholdPace, form.swimCss].some(
    (value) => value.trim().length > 0,
  );
}

function formatSyncedLabel(initial: ProfileData | null) {
  if (!initial?.thresholdsSyncedAt) {
    return null;
  }
  return new Date(initial.thresholdsSyncedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type CalibrationActionsOptions = {
  initial: ProfileData | null;
  form: ReturnType<typeof useCalibrationFormState>;
  queryClient: QueryClient;
  router: AppRouterInstance;
  guardDisabled: boolean;
  applyEstimates: ReturnType<typeof useApplyThresholdEstimates>;
  setSaving: (value: boolean) => void;
  setImporting: (value: boolean) => void;
  setMessage: (value: string | null) => void;
  setError: (value: string | null) => void;
};

function useCalibrationActions(options: CalibrationActionsOptions) {
  const {
    initial,
    form,
    queryClient,
    router,
    guardDisabled,
    applyEstimates,
    setSaving,
    setImporting,
    setMessage,
    setError,
  } = options;
  async function handleGarminImport() {
    if (guardDisabled) {
      return;
    }
    setImporting(true);
    setError(null);
    setMessage(null);
    try {
      const data = await fetchGarminImport();
      if (!data.imported) {
        const feedback = buildGarminImportMessage(data);
        if ((data.failedSources ?? []).length > 0) {
          setError(feedback);
        } else {
          setMessage(feedback);
        }
        return;
      }
      applyGarminResult(data, form);
      setMessage(buildGarminImportMessage(data));
      router.refresh();
      await invalidateAfterAthleteProfileSave(queryClient);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setImporting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guardDisabled) {
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await persistCalibrationPatch(initial, form, queryClient, router);
      if (result === 'empty') {
        setMessage('Rien à enregistrer.');
        setSaving(false);
        return;
      }
      setMessage('Calibration enregistrée.');
      toast.success('Calibration enregistrée');
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setSaving(false);
    }
  }

  async function handleApplyEstimates(fields: ThresholdField[]) {
    if (guardDisabled) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const result = await applyEstimates.mutateAsync(fields);
      const applied = result as {
        profile?: {
          ftpW?: number | null;
          runThresholdPaceSecPerKm?: number | null;
          swimCssSecPer100m?: number | null;
        };
      };
      if (applied.profile) {
        applyEstimateProfile(applied.profile, form);
      }
      setMessage('Seuils estimés appliqués depuis tes records.');
      router.refresh();
      await invalidateAfterAthleteProfileSave(queryClient);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  return { handleGarminImport, handleSubmit, handleApplyEstimates };
}

export function usePerformanceCalibration(
  initial: ProfileData | null,
  queryClient: QueryClient,
  router: AppRouterInstance,
) {
  const form = useCalibrationFormState(initial);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useResetWhenHidden(() => {
    setMessage(null);
    setError(null);
  });

  const previewQuery = useThresholdPreview();
  const historyQuery = useThresholdHistory();
  const applyEstimates = useApplyThresholdEstimates();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();

  const { handleGarminImport, handleSubmit, handleApplyEstimates } = useCalibrationActions({
    initial,
    form,
    queryClient,
    router,
    guardDisabled,
    applyEstimates,
    setSaving,
    setImporting,
    setMessage,
    setError,
  });

  const baseline = useMemo(
    () => calibrationValuesFromProfile(initial ?? ({} as ProfileData)),
    [initial],
  );
  const dirty = isCalibrationDirty(form, baseline);
  const hasThresholds = hasCalibrationThresholds(form);
  const syncedLabel = formatSyncedLabel(initial);

  return {
    ...form,
    saving,
    importing,
    message,
    error,
    preview: previewQuery.data,
    history: historyQuery.data ?? [],
    applyEstimates,
    offline,
    guardDisabled,
    offlineLabel,
    handleGarminImport,
    handleSubmit,
    handleApplyEstimates,
    dirty,
    hasThresholds,
    syncedLabel,
    initial,
  };
}
