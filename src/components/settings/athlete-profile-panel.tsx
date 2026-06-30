"use client";

import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useApplyThresholdEstimates,
  useThresholdHistory,
  useThresholdPreview,
} from "@/hooks/use-data";
import { queryKeys } from "@/lib/client/keys";

interface ProfileData {
  ftpW: number | null;
  maxHr: number | null;
  lthr: number | null;
  runThresholdPaceSecPerKm: number | null;
  vo2maxRunning: number | null;
  vo2maxCycling: number | null;
  thresholdsSyncedAt: string | null;
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
  if (secPerKm == null) return "";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parsePaceInput(value: string): number | null {
  if (!value.trim()) return null;
  const parts = value.split(":");
  if (parts.length !== 2) return null;
  const m = Number(parts[0]);
  const s = Number(parts[1]);
  if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
  return m * 60 + s;
}

export function AthleteProfilePanel({
  initial,
}: {
  initial: ProfileData | null;
}) {
  const [ftpW, setFtpW] = useState(initial?.ftpW?.toString() ?? "");
  const [maxHr, setMaxHr] = useState(initial?.maxHr?.toString() ?? "");
  const [lthr, setLthr] = useState(initial?.lthr?.toString() ?? "");
  const [thresholdPace, setThresholdPace] = useState(
    paceToInput(initial?.runThresholdPaceSecPerKm ?? null),
  );
  const [vo2maxRunning, setVo2maxRunning] = useState<number | null>(
    initial?.vo2maxRunning ?? null,
  );
  const [vo2maxCycling, setVo2maxCycling] = useState<number | null>(
    initial?.vo2maxCycling ?? null,
  );
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
      const res = await fetch("/api/athlete-profile/import-garmin", {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as
        | (GarminImportResult & { error?: string })
        | null;
      if (!res.ok || !data) {
        throw new Error(data?.error ?? "Échec de l'import Garmin");
      }
      if (!data.imported) {
        setMessage("Aucun seuil trouvé sur ton compte Garmin.");
        return;
      }
      if (data.ftpW != null) setFtpW(String(data.ftpW));
      if (data.lthr != null) setLthr(String(data.lthr));
      if (data.runThresholdPaceSecPerKm != null)
        setThresholdPace(paceToInput(data.runThresholdPaceSecPerKm));
      setVo2maxRunning(data.vo2maxRunning);
      setVo2maxCycling(data.vo2maxCycling);
      setMessage("Seuils importés depuis Garmin et enregistrés.");
      await queryClient.invalidateQueries({ queryKey: ["activity-stream"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
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
      const res = await fetch("/api/athlete-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ftpW: ftpW ? Number(ftpW) : null,
          maxHr: maxHr ? Number(maxHr) : null,
          lthr: lthr ? Number(lthr) : null,
          runThresholdPaceSecPerKm: parsePaceInput(thresholdPace),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Erreur");
      }
      setMessage("Profil enregistré — les zones et métriques seront recalculées.");
      await queryClient.invalidateQueries({ queryKey: ["activity-stream"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.thresholdPreview });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyEstimates() {
    setError(null);
    setMessage(null);
    try {
      const result = await applyEstimates.mutateAsync();
      const applied = result as { profile?: { ftpW?: number | null; runThresholdPaceSecPerKm?: number | null } };
      if (applied.profile?.ftpW != null) setFtpW(String(applied.profile.ftpW));
      if (applied.profile?.runThresholdPaceSecPerKm != null) {
        setThresholdPace(paceToInput(applied.profile.runThresholdPaceSecPerKm));
      }
      setMessage("Seuils estimés appliqués depuis tes records.");
      await queryClient.invalidateQueries({ queryKey: ["activity-stream"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const preview = previewQuery.data;
  const history = historyQuery.data ?? [];

  const syncedLabel = initial?.thresholdsSyncedAt
    ? new Date(initial.thresholdsSyncedAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-md text-sm text-muted-foreground">
          Ces seuils alimentent les zones FC/puissance, l&apos;IF, le TSS et le
          découplage sur chaque séance. Sans profil, des estimations sont
          utilisées.
        </p>
        <div className="flex flex-col items-end gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGarminImport}
            disabled={importing}
          >
            <Download className="size-4" />
            {importing ? "Import…" : "Importer depuis Garmin"}
          </Button>
          {syncedLabel && (
            <span className="text-[11px] text-muted-foreground">
              Importé le {syncedLabel}
            </span>
          )}
        </div>
      </div>

      {preview?.hasChanges && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
          <p className="text-sm font-medium">Seuils estimés depuis tes records</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {preview.changes.map((c) => (
              <li key={c.field}>
                {c.label} : {c.from} →{" "}
                <span className="font-medium text-foreground">{c.to}</span>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={handleApplyEstimates}
            disabled={applyEstimates.isPending}
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
        <div className="rounded-lg border border-border/60 bg-card/30 p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Historique des seuils
          </p>
          <ul className="mt-2 space-y-1.5">
            {history.slice(0, 5).map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
              >
                <span>
                  {format(s.createdAt, "d MMM yyyy", {
                    locale: fr,
                  })}{" "}
                  · {s.source}
                </span>
                <span className="font-mono text-foreground">
                  {[
                    s.ftpW != null ? `FTP ${s.ftpW}W` : null,
                    s.runThresholdPaceSecPerKm != null
                      ? paceToInput(s.runThresholdPaceSecPerKm)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(vo2maxRunning != null || vo2maxCycling != null) && (
        <div className="flex flex-wrap gap-3">
          {vo2maxRunning != null && (
            <div className="rounded-lg border border-border/60 bg-card/40 px-4 py-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                VO2max course
              </p>
              <p className="font-mono text-xl font-semibold text-emerald-600">
                {vo2maxRunning}
              </p>
            </div>
          )}
          {vo2maxCycling != null && (
            <div className="rounded-lg border border-border/60 bg-card/40 px-4 py-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                VO2max vélo
              </p>
              <p className="font-mono text-xl font-semibold text-cyan-600">
                {vo2maxCycling}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ftpW">FTP vélo (W)</Label>
          <Input
            id="ftpW"
            type="number"
            min={1}
            placeholder="280"
            value={ftpW}
            onChange={(e) => setFtpW(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxHr">FC max (bpm)</Label>
          <Input
            id="maxHr"
            type="number"
            min={1}
            placeholder="190"
            value={maxHr}
            onChange={(e) => setMaxHr(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lthr">FC seuil / LTHR (bpm)</Label>
          <Input
            id="lthr"
            type="number"
            min={1}
            placeholder="168"
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
      </div>
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={saving}>
        {saving ? "Enregistrement…" : "Enregistrer le profil"}
      </Button>
    </form>
  );
}
