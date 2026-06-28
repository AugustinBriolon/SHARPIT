"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { queryKeys } from "@/lib/client/keys";

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

export function StravaPanel({
  configured,
  account,
  statusMessage,
}: StravaPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const response = await fetch("/api/strava/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setResult(data.error ?? "Synchronisation échouée");
      } else {
        setResult(
          `${data.imported} importée(s), ${data.skipped} ignorée(s) sur ${data.fetched} récupérée(s).`,
        );
        await queryClient.invalidateQueries({
          queryKey: queryKeys.activities,
        });
        router.refresh();
      }
    } finally {
      setSyncing(false);
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
          <Button variant="outline" onClick={handleDisconnect}>
            Déconnecter
          </Button>
        </div>

        {result && <p className="text-sm text-muted-foreground">{result}</p>}
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
