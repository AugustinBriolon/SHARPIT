"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { queryKeys } from "@/lib/client/keys";
import type { RecordChange } from "@/lib/records";

interface StravaPanelProps {
  configured: boolean;
  account: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    lastSyncAt: string | null;
  } | null;
  statusMessage?: string;
}

function RecordChangesBanner({ changes }: { changes: RecordChange[] }) {
  if (changes.length === 0) return null;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
      <p className="font-medium text-primary">
        {changes.length} record{changes.length > 1 ? "s" : ""} battu
        {changes.length > 1 ? "s" : ""}
      </p>
      <ul className="mt-2 space-y-1.5">
        {changes.map((c) => (
          <li key={c.category} className="flex flex-wrap items-baseline gap-x-1">
            {c.activityId ? (
              <Link
                href={`/training/${c.activityId}`}
                className="font-medium hover:text-primary hover:underline"
              >
                {c.label}
              </Link>
            ) : (
              <span className="font-medium">{c.label}</span>
            )}
            <span className="text-muted-foreground">—</span>
            <span className="font-mono font-semibold tabular-nums">
              {c.displayValue}
            </span>
            {c.previousDisplayValue && (
              <span className="text-xs text-muted-foreground">
                (avant : {c.previousDisplayValue})
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StravaPanel({
  configured,
  account,
  statusMessage,
}: StravaPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [syncRecordChanges, setSyncRecordChanges] = useState<RecordChange[]>([]);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);
  const [backfillRecordChanges, setBackfillRecordChanges] = useState<
    RecordChange[]
  >([]);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    setSyncRecordChanges([]);
    try {
      const response = await fetch("/api/strava/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setResult(data.error ?? "Synchronisation échouée");
      } else {
        setResult(
          `${data.imported} importée(s), ${data.skipped} ignorée(s) sur ${data.fetched} récupérée(s).`,
        );
        setSyncRecordChanges(
          Array.isArray(data.recordChanges) ? data.recordChanges : [],
        );
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.activities }),
          queryClient.invalidateQueries({ queryKey: queryKeys.records }),
        ]);
        router.refresh();
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleBackfill() {
    setBackfilling(true);
    setBackfillResult(null);
    setBackfillRecordChanges([]);
    try {
      const response = await fetch("/api/strava/backfill", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setBackfillResult(data.error ?? "Backfill échoué");
      } else {
        const base = `${data.processed} séance(s) traitée(s), ${data.withData} avec données détaillées.`;
        const tail =
          data.remaining > 0
            ? data.stopped === "rate_limited"
              ? ` Limite Strava atteinte, ${data.remaining} restante(s) — réessaie dans ~15 min.`
              : ` ${data.remaining} restante(s), relance pour continuer.`
            : " Historique complet ✓";
        setBackfillResult(base + tail);
        setBackfillRecordChanges(
          Array.isArray(data.recordChanges) ? data.recordChanges : [],
        );
        await queryClient.invalidateQueries({ queryKey: queryKeys.records });
      }
    } finally {
      setBackfilling(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Déconnecter Strava ? Les séances déjà importées sont conservées."))
      return;
    await fetch("/api/strava/disconnect", { method: "POST" });
    router.refresh();
  }

  if (!configured) {
    return (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Strava n&apos;est pas encore configuré. Crée une application sur{" "}
          <a
            href="https://www.strava.com/settings/api"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            strava.com/settings/api
          </a>{" "}
          puis ajoute ces variables dans ton fichier <code>.env</code> :
        </p>
        <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-3 font-mono text-xs">
{`STRAVA_CLIENT_ID="ton_client_id"
STRAVA_CLIENT_SECRET="ton_client_secret"
STRAVA_REDIRECT_URI="http://localhost:3000/api/strava/callback"`}
        </pre>
        <p>
          Dans les réglages Strava, mets <strong>localhost</strong> comme
          &laquo;&nbsp;Authorization Callback Domain&nbsp;&raquo;, puis relance
          le serveur.
        </p>
      </div>
    );
  }

  if (account) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {account.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.avatarUrl}
              alt=""
              className="size-10 rounded-full"
            />
          )}
          <div>
            <p className="font-medium">
              {account.firstName} {account.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              {account.lastSyncAt
                ? `Dernière sync : ${new Date(account.lastSyncAt).toLocaleString("fr-FR")}`
                : "Jamais synchronisé"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? "Synchronisation…" : "Synchroniser maintenant"}
          </Button>
          <Button
            variant="outline"
            onClick={handleBackfill}
            disabled={backfilling}
          >
            {backfilling ? "Récupération…" : "Récupérer les données détaillées"}
          </Button>
          <Button variant="outline" onClick={handleDisconnect}>
            Déconnecter
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          La récupération détaillée alimente les records et les courbes de
          puissance/allure (par lots, pour respecter les limites Strava).
        </p>

        {result && <p className="text-sm text-muted-foreground">{result}</p>}
        <RecordChangesBanner changes={syncRecordChanges} />
        {backfillResult && (
          <p className="text-sm text-muted-foreground">{backfillResult}</p>
        )}
        <RecordChangesBanner changes={backfillRecordChanges} />
        {statusMessage && (
          <p className="text-sm text-muted-foreground">{statusMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Connecte ton compte Strava pour importer automatiquement tes activités
        (course, vélo, natation…).
      </p>
      <a href="/api/strava/connect" className={buttonVariants()}>
        Connecter Strava
      </a>
      {statusMessage && (
        <p className="text-sm text-destructive">{statusMessage}</p>
      )}
    </div>
  );
}
