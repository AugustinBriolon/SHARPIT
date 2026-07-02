'use client';

import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useApplyThresholdEstimates,
  useThresholdHistory,
  useThresholdPreview,
} from '@/hooks/use-data';
import { queryKeys } from '@/lib/query/keys';

interface ProfileData {
  ftpW: number | null;
  maxHr: number | null;
  lthr: number | null;
  runThresholdPaceSecPerKm: number | null;
  vo2maxRunning: number | null;
  vo2maxCycling: number | null;
  thresholdsSyncedAt: string | null;
  sleepTargetMinutes: number | null;
  sleepBedtimeTargetMin: number | null;
}

interface GarminImportResult {
  imported: boolean;
  ftpW: number | null;
  lthr: number | null;
  runThresholdPaceSecPerKm: number | null;
  vo2maxRunning: number | null;
  vo2maxCycling: number | null;
}

function paceToInput(secPerKm: number | null): string {
  if (secPerKm == null) return '';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseClockInput(value: string): number | null {
  if (!value.trim()) return null;
  const parts = value.split(':');
  if (parts.length !== 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function clockToInput(min: number | null): string {
  if (min == null) return '';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parsePaceInput(value: string): number | null {
  if (!value.trim()) return null;
  const parts = value.split(':');
  if (parts.length !== 2) return null;
  const m = Number(parts[0]);
  const s = Number(parts[1]);
  if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
  return m * 60 + s;
}

export function AthleteProfilePanel({ initial }: { initial: ProfileData | null }) {
  const [ftpW, setFtpW] = useState(initial?.ftpW?.toString() ?? '');
  const [maxHr, setMaxHr] = useState(initial?.maxHr?.toString() ?? '');
  const [lthr, setLthr] = useState(initial?.lthr?.toString() ?? '');
  const [thresholdPace, setThresholdPace] = useState(
    paceToInput(initial?.runThresholdPaceSecPerKm ?? null),
  );
  const [sleepHours, setSleepHours] = useState(
    initial?.sleepTargetMinutes != null ? String(initial.sleepTargetMinutes / 60) : '8',
  );
  const [sleepBedtime, setSleepBedtime] = useState(
    clockToInput(initial?.sleepBedtimeTargetMin ?? null),
  );
  const [vo2maxRunning, setVo2maxRunning] = useState<number | null>(initial?.vo2maxRunning ?? null);
  const [vo2maxCycling, setVo2maxCycling] = useState<number | null>(initial?.vo2maxCycling ?? null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const previewQuery = useThresholdPreview();
  const historyQuery = useThresholdHistory();
  const applyEstimates = useApplyThresholdEstimates();

  async function handleGarminImport() {
    setImporting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/athlete-profile/import-garmin', {
        method: 'POST',
      });
      const data = (await res.json().catch(() => null)) as
        (GarminImportResult & { error?: string }) | null;
      if (!res.ok || !data) {
        throw new Error(data?.error ?? "Échec de l'import Garmin");
      }
      if (!data.imported) {
        setMessage('Aucun seuil trouvé sur ton compte Garmin.');
        return;
      }
      if (data.ftpW != null) setFtpW(String(data.ftpW));
      if (data.lthr != null) setLthr(String(data.lthr));
      if (data.runThresholdPaceSecPerKm != null)
        setThresholdPace(paceToInput(data.runThresholdPaceSecPerKm));
      setVo2maxRunning(data.vo2maxRunning);
      setVo2maxCycling(data.vo2maxCycling);
      setMessage('Seuils importés depuis Garmin et enregistrés.');
      await queryClient.invalidateQueries({ queryKey: ['activity-stream'] });
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
      const sleepMinutes = sleepHours.trim() ? Math.round(Number(sleepHours) * 60) : null;
      if (
        sleepMinutes != null &&
        (!Number.isFinite(sleepMinutes) || sleepMinutes < 240 || sleepMinutes > 720)
      ) {
        throw new Error('Objectif sommeil invalide (entre 4 h et 12 h).');
      }
      const bedtimeMin = parseClockInput(sleepBedtime);
      if (sleepBedtime.trim() && bedtimeMin == null) {
        throw new Error('Heure de coucher invalide (format HH:mm).');
      }

      const res = await fetch('/api/athlete-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ftpW: ftpW ? Number(ftpW) : null,
          maxHr: maxHr ? Number(maxHr) : null,
          lthr: lthr ? Number(lthr) : null,
          runThresholdPaceSecPerKm: parsePaceInput(thresholdPace),
          sleepTargetMinutes: sleepMinutes,
          sleepBedtimeTargetMin: bedtimeMin,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          detail?: string;
          details?: { fieldErrors?: Record<string, string[]> };
        } | null;
        const fieldMsg = data?.details?.fieldErrors
          ? Object.values(data.details.fieldErrors).flat().join(' · ')
          : null;
        throw new Error(fieldMsg || data?.detail || data?.error || 'Erreur');
      }
      setMessage('Profil enregistré — les zones et métriques seront recalculées.');
      await queryClient.invalidateQueries({ queryKey: ['activity-stream'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.thresholdPreview });
      await queryClient.invalidateQueries({ queryKey: queryKeys.athleteProfile });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
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
      await queryClient.invalidateQueries({ queryKey: ['activity-stream'] });
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

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-muted-foreground max-w-md text-sm">
          Ces seuils alimentent les zones FC/puissance, l&apos;IF, le TSS et le découplage sur
          chaque séance. Sans profil, des estimations sont utilisées.
        </p>
        <div className="flex flex-col items-end gap-1">
          <Button
            disabled={importing}
            size="sm"
            type="button"
            variant="outline"
            onClick={handleGarminImport}
          >
            <Download className="size-4" />
            {importing ? 'Import…' : 'Importer depuis Garmin'}
          </Button>
          {syncedLabel && (
            <span className="text-muted-foreground text-[11px]">Importé le {syncedLabel}</span>
          )}
        </div>
      </div>

      {preview?.hasChanges && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
          <p className="text-sm font-medium">Seuils estimés depuis tes records</p>
          <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
            {preview.changes.map((c) => (
              <li key={c.field}>
                {c.label} : {c.from} → <span className="text-foreground font-medium">{c.to}</span>
              </li>
            ))}
          </ul>
          <Button
            className="mt-3"
            disabled={applyEstimates.isPending}
            size="sm"
            type="button"
            variant="outline"
            onClick={handleApplyEstimates}
          >
            {applyEstimates.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Appliquer les estimations
          </Button>
        </div>
      )}

      {history.length > 0 && (
        <div className="border-border/60 bg-card/30 rounded-lg border p-3">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Historique des seuils
          </p>
          <ul className="mt-2 space-y-1.5">
            {history.slice(0, 5).map((s) => (
              <li
                key={s.id}
                className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <span>
                  {format(s.createdAt, 'd MMM yyyy', {
                    locale: fr,
                  })}{' '}
                  · {s.source}
                </span>
                <span className="text-foreground font-mono">
                  {[
                    s.ftpW != null ? `FTP ${s.ftpW}W` : null,
                    s.runThresholdPaceSecPerKm != null
                      ? paceToInput(s.runThresholdPaceSecPerKm)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(vo2maxRunning != null || vo2maxCycling != null) && (
        <div className="flex flex-wrap gap-3">
          {vo2maxRunning != null && (
            <div className="border-border/60 bg-card/40 rounded-lg border px-4 py-2">
              <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
                VO2max course
              </p>
              <p className="font-mono text-xl font-semibold text-emerald-600">{vo2maxRunning}</p>
            </div>
          )}
          {vo2maxCycling != null && (
            <div className="border-border/60 bg-card/40 rounded-lg border px-4 py-2">
              <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
                VO2max vélo
              </p>
              <p className="font-mono text-xl font-semibold text-cyan-600">{vo2maxCycling}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ftpW">FTP vélo (W)</Label>
          <Input
            id="ftpW"
            min={1}
            placeholder="280"
            type="number"
            value={ftpW}
            onChange={(e) => setFtpW(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxHr">FC max (bpm)</Label>
          <Input
            id="maxHr"
            min={1}
            placeholder="190"
            type="number"
            value={maxHr}
            onChange={(e) => setMaxHr(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lthr">FC seuil / LTHR (bpm)</Label>
          <Input
            id="lthr"
            min={1}
            placeholder="168"
            type="number"
            value={lthr}
            onChange={(e) => setLthr(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="thresholdPace">Allure seuil (min:sec/km)</Label>
          <Input
            id="thresholdPace"
            placeholder="4:15"
            value={thresholdPace}
            onChange={(e) => setThresholdPace(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sleepHours">Objectif sommeil (heures)</Label>
          <Input
            id="sleepHours"
            max={12}
            min={5}
            placeholder="8"
            step={0.25}
            type="number"
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sleepBedtime">Heure de coucher visée (HH:mm)</Label>
          <Input
            id="sleepBedtime"
            placeholder="22:30"
            value={sleepBedtime}
            onChange={(e) => setSleepBedtime(e.target.value)}
          />
        </div>
      </div>
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button disabled={saving} type="submit">
        {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
      </Button>
    </form>
  );
}
