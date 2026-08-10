'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Check, Download, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import { ProfileFormSection } from '@/components/settings/profile/profile-form-section';
import {
  NUMERIC_INPUT_CLASS,
  paceToInput,
  parsePaceInput,
} from '@/components/settings/profile/profile-input-format';
import { commitProfileSave, saveProfilePatch } from '@/components/settings/profile/profile-save';
import type { ProfileData } from '@/components/settings/profile/profile-types';
import { ThresholdHistoryPanel } from '@/components/settings/profile/threshold-history-panel';
import { Vo2maxIndicators } from '@/components/settings/profile/vo2max-indicators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import {
  useApplyThresholdEstimates,
  useThresholdHistory,
  useThresholdPreview,
} from '@/hooks/use-data';
import { shouldHydrateProfileForm } from '@/lib/profile/map-athlete-profile';
import { invalidateAfterAthleteProfileSave } from '@/lib/query/invalidate-after-athlete-profile-save';

interface GarminImportResult {
  imported: boolean;
  ftpW: number | null;
  maxHr: number | null;
  lthr: number | null;
  runThresholdPaceSecPerKm: number | null;
  vo2maxRunning: number | null;
  vo2maxCycling: number | null;
}

export function PerformanceCalibrationPanel({ initial }: { initial: ProfileData | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [ftpW, setFtpW] = useState(initial?.ftpW?.toString() ?? '');
  const [maxHr, setMaxHr] = useState(initial?.maxHr?.toString() ?? '');
  const [lthr, setLthr] = useState(initial?.lthr?.toString() ?? '');
  const [thresholdPace, setThresholdPace] = useState(() =>
    paceToInput(initial?.runThresholdPaceSecPerKm ?? null),
  );
  const [vo2maxRunning, setVo2maxRunning] = useState<number | null>(initial?.vo2maxRunning ?? null);
  const [vo2maxCycling, setVo2maxCycling] = useState<number | null>(initial?.vo2maxCycling ?? null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The saved / failed banner is feedback on an action just taken, so it must
  // not still be here next time the athlete opens this panel.
  useResetWhenHidden(() => {
    setMessage(null);
    setError(null);
  });
  const previewQuery = useThresholdPreview();
  const historyQuery = useThresholdHistory();
  const applyEstimates = useApplyThresholdEstimates();

  useEffect(() => {
    if (!shouldHydrateProfileForm(initial)) return;
    setFtpW(initial.ftpW?.toString() ?? '');
    setMaxHr(initial.maxHr?.toString() ?? '');
    setLthr(initial.lthr?.toString() ?? '');
    setThresholdPace(paceToInput(initial.runThresholdPaceSecPerKm ?? null));
    setVo2maxRunning(initial.vo2maxRunning ?? null);
    setVo2maxCycling(initial.vo2maxCycling ?? null);
  }, [
    initial,
    initial?.ftpW,
    initial?.maxHr,
    initial?.lthr,
    initial?.runThresholdPaceSecPerKm,
    initial?.vo2maxRunning,
    initial?.vo2maxCycling,
  ]);

  async function handleGarminImport() {
    setImporting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/athlete-profile/import-garmin', { method: 'POST' });
      const data = (await res.json().catch(() => null)) as
        | (GarminImportResult & {
            error?: string;
          })
        | null;
      if (!res.ok || !data) {
        throw new Error(data?.error ?? "Échec de l'import Garmin");
      }
      if (!data.imported) {
        setMessage('Aucun seuil trouvé sur ton compte Garmin.');
        return;
      }
      if (data.ftpW != null) setFtpW(String(data.ftpW));
      if (data.maxHr != null) setMaxHr(String(data.maxHr));
      if (data.lthr != null) setLthr(String(data.lthr));
      if (data.runThresholdPaceSecPerKm != null) {
        setThresholdPace(paceToInput(data.runThresholdPaceSecPerKm));
      }
      setVo2maxRunning(data.vo2maxRunning);
      setVo2maxCycling(data.vo2maxCycling);
      setMessage('Seuils importés depuis Garmin et enregistrés.');
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
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const patch = {
        ftpW: ftpW ? Number(ftpW) : null,
        maxHr: maxHr ? Number(maxHr) : null,
        lthr: lthr ? Number(lthr) : null,
        runThresholdPaceSecPerKm: parsePaceInput(thresholdPace),
      };
      const previousProfile = saveProfilePatch(queryClient, patch);

      const res = await fetch('/api/athlete-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      await commitProfileSave(queryClient, router, res, previousProfile);
      setMessage('Calibration enregistrée.');
      toast.success('Calibration enregistrée');
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setSaving(false);
    }
  }

  async function handleApplyEstimates() {
    setError(null);
    setMessage(null);
    try {
      const result = await applyEstimates.mutateAsync();
      const applied = result as {
        profile?: { ftpW?: number | null; runThresholdPaceSecPerKm?: number | null };
      };
      if (applied.profile?.ftpW != null) setFtpW(String(applied.profile.ftpW));
      if (applied.profile?.runThresholdPaceSecPerKm != null) {
        setThresholdPace(paceToInput(applied.profile.runThresholdPaceSecPerKm));
      }
      setMessage('Seuils estimés appliqués depuis tes records.');
      router.refresh();
      await invalidateAfterAthleteProfileSave(queryClient);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  const preview = previewQuery.data;
  const history = historyQuery.data ?? [];
  const syncedLabel = initial?.thresholdsSyncedAt
    ? new Date(initial.thresholdsSyncedAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;
  const hasThresholds = [ftpW, maxHr, lthr, thresholdPace].some((value) => value.trim().length > 0);

  const baseline = useMemo(
    () => ({
      ftpW: initial?.ftpW?.toString() ?? '',
      maxHr: initial?.maxHr?.toString() ?? '',
      lthr: initial?.lthr?.toString() ?? '',
      thresholdPace: paceToInput(initial?.runThresholdPaceSecPerKm ?? null),
    }),
    [initial],
  );
  const dirty =
    ftpW !== baseline.ftpW ||
    maxHr !== baseline.maxHr ||
    lthr !== baseline.lthr ||
    thresholdPace !== baseline.thresholdPace;

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground max-w-xl text-xs leading-relaxed">
          Ajuste ici les repères qui servent à interpréter l’intensité, estimer la charge et
          comparer tes progrès dans le temps.
        </p>
        <div className="flex flex-col items-end gap-0.5">
          <Button disabled={importing} type="button" variant="outline" onClick={handleGarminImport}>
            <Download className="size-3.5" aria-hidden />
            {importing ? 'Import…' : 'Garmin'}
          </Button>
          {syncedLabel ? (
            <span className="text-muted-foreground text-label">
              Sync · <span className="text-data">{syncedLabel}</span>
            </span>
          ) : null}
        </div>
      </div>

      <ProfileFormSection
        description="Lecture rapide avant modification."
        title="Repères actuels"
        compact
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-muted/30 rounded-analysis border-analysis-border/60 border px-3 py-2">
            <p className="text-label">FTP vélo</p>
            <p className="text-data mt-0.5 text-base font-semibold tabular-nums">
              {ftpW || '—'}
              {ftpW ? ' W' : ''}
            </p>
          </div>
          <div className="bg-muted/30 rounded-analysis border-analysis-border/60 border px-3 py-2">
            <p className="text-label">FC max</p>
            <p className="text-data mt-0.5 text-base font-semibold tabular-nums">
              {maxHr || '—'}
              {maxHr ? ' bpm' : ''}
            </p>
          </div>
          <div className="bg-muted/30 rounded-analysis border-analysis-border/60 border px-3 py-2">
            <p className="text-label">LTHR</p>
            <p className="text-data mt-0.5 text-base font-semibold tabular-nums">
              {lthr || '—'}
              {lthr ? ' bpm' : ''}
            </p>
          </div>
          <div className="bg-muted/30 rounded-analysis border-analysis-border/60 border px-3 py-2">
            <p className="text-label">Allure seuil</p>
            <p className="text-data mt-0.5 text-base font-semibold tabular-nums">
              {thresholdPace || '—'}
            </p>
          </div>
        </div>
      </ProfileFormSection>

      <ProfileFormSection
        description="Modification manuelle, estimations et historique."
        title="Ajuster les seuils"
        compact
      >
        {preview?.hasChanges ? (
          <div className="analysis-panel rounded-analysis space-y-2 px-3 py-2.5">
            <p className="text-xs font-medium">Proposition depuis tes records</p>
            <ul className="text-muted-foreground space-y-0.5 text-xs">
              {preview.changes.map((c) => (
                <li key={c.field}>
                  {c.label} : <span className="text-data">{c.from}</span> →{' '}
                  <span className="text-data text-foreground font-medium">{c.to}</span>
                </li>
              ))}
            </ul>
            <Button
              disabled={applyEstimates.isPending}
              type="button"
              variant="outline"
              onClick={handleApplyEstimates}
            >
              {applyEstimates.isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="size-3.5" aria-hidden />
              )}
              Appliquer
            </Button>
          </div>
        ) : null}

        {history.length > 0 ? <ThresholdHistoryPanel history={history} /> : null}
        <Vo2maxIndicators vo2maxCycling={vo2maxCycling} vo2maxRunning={vo2maxRunning} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ftpW">FTP vélo (W)</Label>
            <Input
              className={NUMERIC_INPUT_CLASS}
              id="ftpW"
              min={1}
              placeholder="280"
              type="number"
              value={ftpW}
              onChange={(e) => setFtpW(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxHr">FC max (bpm)</Label>
            <Input
              className={NUMERIC_INPUT_CLASS}
              id="maxHr"
              min={1}
              placeholder="190"
              type="number"
              value={maxHr}
              onChange={(e) => setMaxHr(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lthr">LTHR (bpm)</Label>
            <Input
              className={NUMERIC_INPUT_CLASS}
              id="lthr"
              min={1}
              placeholder="168"
              type="number"
              value={lthr}
              onChange={(e) => setLthr(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="thresholdPace">Allure seuil (min:sec/km)</Label>
            <Input
              className={NUMERIC_INPUT_CLASS}
              id="thresholdPace"
              placeholder="4:15"
              value={thresholdPace}
              onChange={(e) => setThresholdPace(e.target.value)}
            />
          </div>
        </div>
      </ProfileFormSection>

      {!hasThresholds ? (
        <p className="text-muted-foreground text-xs">
          Aucun seuil manuel renseigné pour le moment. Tu peux commencer par Garmin ou par les
          estimations issues de tes records.
        </p>
      ) : null}
      {message ? (
        <p aria-live="polite" className="text-primary text-sm">
          {message}
        </p>
      ) : null}
      {error ? (
        <p aria-live="assertive" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button disabled={saving || !dirty} type="submit">
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}
