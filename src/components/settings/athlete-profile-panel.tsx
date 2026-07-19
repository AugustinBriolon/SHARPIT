'use client';

import { ActivityType } from '@prisma/client';
import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useApplyThresholdEstimates,
  useThresholdHistory,
  useThresholdPreview,
} from '@/hooks/use-data';
import { birthDateToInput } from '@/lib/athlete-profile-utils';
import { queryKeys } from '@/lib/query/keys';
import type { ClientThresholdSnapshot } from '@/lib/query/types';
import { dedupeThresholdHistory, describeThresholdChanges } from '@/lib/threshold-history';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, ChevronDown, Download, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ProfileData {
  heightCm: number | null;
  birthDate: string | null;
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

const THRESHOLD_SOURCE_LABELS: Record<string, string> = {
  estimated: 'estimé',
  garmin: 'Garmin',
  manual: 'manuel',
};

const NUMERIC_INPUT_CLASS = 'text-data tabular-nums';

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

function formatThresholdSource(source: string): string {
  return THRESHOLD_SOURCE_LABELS[source] ?? source;
}

function ProfileFormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-analysis-border/60 rounded-analysis space-y-4 border px-4 py-4">
      <div>
        <h3 className="text-section-title">{title}</h3>
        {description ? (
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ThresholdHistoryPanel({ history }: { history: ClientThresholdSnapshot[] }) {
  const [expanded, setExpanded] = useState(false);
  const deduped = useMemo(() => dedupeThresholdHistory(history), [history]);

  if (deduped.length === 0) return null;

  const entries = deduped.map((snapshot, index) => ({
    snapshot,
    changes: describeThresholdChanges(snapshot, deduped[index + 1]),
  }));

  const latest = entries[0]!;
  const olderCount = entries.length - 1;

  return (
    <div className="bg-muted/30 rounded-analysis border-analysis-border/60 space-y-2 border px-3 py-3">
      <p className="text-label">Historique des seuils</p>

      <div className="space-y-1">
        <p className="text-muted-foreground text-xs">
          {format(latest.snapshot.createdAt, 'd MMM yyyy', { locale: fr })} ·{' '}
          {formatThresholdSource(latest.snapshot.source)}
        </p>
        <ul className="space-y-0.5">
          {latest.changes.map((change) => (
            <li key={change} className="text-foreground text-sm leading-snug">
              <span className="text-data">{change}</span>
            </li>
          ))}
        </ul>
      </div>

      {olderCount > 0 ? (
        <div className="space-y-2">
          <Button
            className="h-8 px-2 text-xs"
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => setExpanded((open) => !open)}
          >
            <ChevronDown
              className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}
            />
            {expanded
              ? 'Masquer l’historique'
              : `Voir l’historique complet (${olderCount} mise${olderCount > 1 ? 's' : ''} antérieure${olderCount > 1 ? 's' : ''})`}
          </Button>

          {expanded ? (
            <ul className="border-analysis-border/60 space-y-3 border-t pt-3">
              {entries.slice(1).map(({ snapshot, changes }) => (
                <li key={snapshot.id} className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    {format(snapshot.createdAt, 'd MMM yyyy', { locale: fr })} ·{' '}
                    {formatThresholdSource(snapshot.source)}
                  </p>
                  <ul className="space-y-0.5">
                    {changes.map((change) => (
                      <li key={change} className="text-sm leading-snug">
                        <span className="text-data text-foreground">{change}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Vo2maxIndicators({
  vo2maxRunning,
  vo2maxCycling,
}: {
  vo2maxRunning: number | null;
  vo2maxCycling: number | null;
}) {
  if (vo2maxRunning == null && vo2maxCycling == null) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {vo2maxRunning != null ? (
          <div className="bg-muted/40 rounded-analysis border-analysis-border/60 border px-3 py-2">
            <p className="text-label flex items-center gap-1.5">
              <ActivityTypeIndicator type={ActivityType.RUN} />
              VO2max
            </p>
            <p className="text-data text-foreground mt-0.5 text-lg font-semibold tabular-nums">
              {vo2maxRunning}
            </p>
          </div>
        ) : null}
        {vo2maxCycling != null ? (
          <div className="bg-muted/40 rounded-analysis border-analysis-border/60 border px-3 py-2">
            <p className="text-label flex items-center gap-1.5">
              <ActivityTypeIndicator type={ActivityType.BIKE} />
              VO2max
            </p>
            <p className="text-data text-foreground mt-0.5 text-lg font-semibold tabular-nums">
              {vo2maxCycling}
            </p>
          </div>
        ) : null}
      </div>
      <p className="text-muted-foreground text-[11px]">Import Garmin — lecture seule</p>
    </div>
  );
}

export function AthleteProfilePanel({ initial }: { initial: ProfileData | null }) {
  const [heightCm, setHeightCm] = useState(initial?.heightCm?.toString() ?? '');
  const [birthDate, setBirthDate] = useState(birthDateToInput(initial?.birthDate ?? null));
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
      if (data.runThresholdPaceSecPerKm != null) {
        setThresholdPace(paceToInput(data.runThresholdPaceSecPerKm));
      }
      setVo2maxRunning(data.vo2maxRunning);
      setVo2maxCycling(data.vo2maxCycling);
      setMessage('Seuils importés depuis Garmin et enregistrés.');
      await queryClient.invalidateQueries({ queryKey: ['activity-stream'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.thresholdHistory });
      await queryClient.invalidateQueries({ queryKey: queryKeys.athleteProfile });
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

      if (heightCm.trim()) {
        const h = Number(heightCm);
        if (!Number.isFinite(h) || h < 100 || h > 250) {
          throw new Error('Taille invalide (entre 100 et 250 cm).');
        }
      }

      const patch = {
        heightCm: heightCm.trim() ? Number(heightCm) : null,
        birthDate: birthDate.trim() || null,
        ftpW: ftpW ? Number(ftpW) : null,
        maxHr: maxHr ? Number(maxHr) : null,
        lthr: lthr ? Number(lthr) : null,
        runThresholdPaceSecPerKm: parsePaceInput(thresholdPace),
        sleepTargetMinutes: sleepMinutes,
        sleepBedtimeTargetMin: bedtimeMin,
      };

      const previousProfile = queryClient.getQueryData(queryKeys.athleteProfile);
      queryClient.setQueryData(queryKeys.athleteProfile, (current: unknown) => {
        if (!current || typeof current !== 'object') return current;
        return { ...current, ...patch };
      });
      setMessage('Profil enregistré — les zones et métriques seront recalculées.');
      setSaving(false);

      const res = await fetch('/api/athlete-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        if (previousProfile !== undefined) {
          queryClient.setQueryData(queryKeys.athleteProfile, previousProfile);
        }
        setMessage(null);
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
      void queryClient.invalidateQueries({ queryKey: ['activity-stream'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.thresholdPreview });
      void queryClient.invalidateQueries({ queryKey: queryKeys.thresholdHistory });
      void queryClient.invalidateQueries({ queryKey: queryKeys.athleteProfile });
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
      await queryClient.invalidateQueries({ queryKey: ['activity-stream'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.athleteProfile });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      // applyEstimates mutation already invalidates history
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
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
          Plus ton profil est juste, plus le coach calibre bien tes zones et tes conseils du jour.
          Mets à jour ici ce qui a changé — le reste s&apos;enrichit avec tes séances.
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
          {syncedLabel ? (
            <span className="text-muted-foreground text-[11px]">
              Dernier import Garmin · <span className="text-data">{syncedLabel}</span>
            </span>
          ) : null}
        </div>
      </div>

      <ProfileFormSection
        description="Pour contextualiser ta composition corporelle et ton âge physiologique."
        title="Identité"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="heightCm">Taille (cm)</Label>
            <Input
              className={NUMERIC_INPUT_CLASS}
              id="heightCm"
              max={250}
              min={100}
              placeholder="178"
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">Date de naissance</Label>
            <Input
              className={NUMERIC_INPUT_CLASS}
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
        </div>
      </ProfileFormSection>

      <ProfileFormSection
        description="Ces repères pilotent tes zones, l’intensité des séances et la charge calculée."
        title="Seuils de performance"
      >
        {preview?.hasChanges ? (
          <div className="analysis-panel rounded-analysis space-y-3 px-3.5 py-3.5">
            <p className="text-sm font-medium">Proposition depuis tes records</p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              {preview.changes.map((c) => (
                <li key={c.field}>
                  {c.label} : <span className="text-data">{c.from}</span> →{' '}
                  <span className="text-data text-foreground font-medium">{c.to}</span>
                </li>
              ))}
            </ul>
            <Button
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
        ) : null}

        {history.length > 0 ? <ThresholdHistoryPanel history={history} /> : null}

        <Vo2maxIndicators vo2maxCycling={vo2maxCycling} vo2maxRunning={vo2maxRunning} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="lthr">FC seuil / LTHR (bpm)</Label>
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
          <div className="space-y-2">
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

      <ProfileFormSection
        description="Pour calibrer tes objectifs de récupération et les conseils sommeil."
        title="Sommeil"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sleepHours">Objectif sommeil (heures)</Label>
            <Input
              className={NUMERIC_INPUT_CLASS}
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
              className={NUMERIC_INPUT_CLASS}
              id="sleepBedtime"
              placeholder="22:30"
              value={sleepBedtime}
              onChange={(e) => setSleepBedtime(e.target.value)}
            />
          </div>
        </div>
      </ProfileFormSection>

      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button disabled={saving} type="submit">
        {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
      </Button>
    </form>
  );
}
