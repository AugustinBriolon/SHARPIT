"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeys } from "@/lib/client/keys";

interface GarminPanelProps {
  account: {
    displayName: string | null;
    fullName: string | null;
    lastSyncAt: string | null;
  } | null;
}

export function GarminPanel({ account }: GarminPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setConnecting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const response = await fetch("/api/garmin/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    });

    setConnecting(false);

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Connexion échouée");
      return;
    }

    router.refresh();
  }

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    setError(null);
    try {
      const response = await fetch("/api/garmin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 60 }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Synchronisation échouée");
      } else {
        setResult(
          `${data.updated} jour(s) mis à jour sur ${data.days} analysés.`,
        );
        await queryClient.invalidateQueries({ queryKey: ["health"] });
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
    if (!confirm("Déconnecter Garmin ? Les données déjà importées sont conservées."))
      return;
    await fetch("/api/garmin/disconnect", { method: "POST" });
    router.refresh();
  }

  if (account) {
    return (
      <div className="space-y-4">
        <div>
          <p className="font-medium">
            {account.fullName ?? account.displayName ?? "Compte Garmin"}
          </p>
          <p className="text-xs text-muted-foreground">
            {account.lastSyncAt
              ? `Dernière sync : ${new Date(account.lastSyncAt).toLocaleString("fr-FR")}`
              : "Jamais synchronisé"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? "Synchronisation…" : "Synchroniser la santé (60j)"}
          </Button>
          <Button variant="outline" onClick={handleDisconnect}>
            Déconnecter
          </Button>
        </div>

        {result && <p className="text-sm text-muted-foreground">{result}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleConnect} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connecte ton compte Garmin pour importer automatiquement sommeil, HRV,
        FC repos et poids. Ton mot de passe n&apos;est jamais stocké — seuls les
        jetons de session le sont.
      </p>

      <div className="space-y-2">
        <Label htmlFor="garmin-username">Email Garmin</Label>
        <Input id="garmin-username" name="username" type="email" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="garmin-password">Mot de passe</Label>
        <Input id="garmin-password" name="password" type="password" required />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={connecting}>
        {connecting ? "Connexion…" : "Connecter Garmin"}
      </Button>

      <p className="text-xs text-muted-foreground">
        Note : si l&apos;authentification à deux facteurs (MFA) est activée sur
        ton compte Garmin, la connexion échouera. Désactive-la temporairement ou
        utilise un compte sans MFA.
      </p>
    </form>
  );
}
