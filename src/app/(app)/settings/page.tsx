import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GarminPanel } from "@/components/settings/garmin-panel";
import { StravaPanel } from "@/components/settings/strava-panel";
import { getGarminAccount } from "@/lib/garmin-sync";
import { getStravaAccount } from "@/lib/strava-sync";
import { isStravaConfigured } from "@/lib/strava";

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  connected: "Compte Strava connecté.",
  denied: "Connexion refusée sur Strava.",
  invalid_state: "Session expirée, réessaie la connexion.",
  no_athlete: "Strava n'a pas renvoyé d'athlète.",
  error: "Une erreur est survenue lors de la connexion.",
};

type PageProps = {
  searchParams: Promise<{ strava?: string }>;
};

export default async function SettingsPage({ searchParams }: PageProps) {
  const { strava } = await searchParams;
  const [stravaAccount, configured, garminAccount] = await Promise.all([
    getStravaAccount(),
    Promise.resolve(isStravaConfigured()),
    getGarminAccount(),
  ]);

  const account = stravaAccount
    ? {
        firstName: stravaAccount.firstName,
        lastName: stravaAccount.lastName,
        avatarUrl: stravaAccount.avatarUrl,
        lastSyncAt: stravaAccount.lastSyncAt?.toISOString() ?? null,
      }
    : null;

  const garmin = garminAccount
    ? {
        displayName: garminAccount.displayName,
        fullName: garminAccount.fullName,
        lastSyncAt: garminAccount.lastSyncAt?.toISOString() ?? null,
      }
    : null;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Settings
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          Réglages
        </h1>
        <p className="mt-1 text-muted-foreground">
          Connecte tes sources de données et configure ton système.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Strava</CardTitle>
          <p className="text-xs text-muted-foreground">Source des activités</p>
        </CardHeader>
        <CardContent>
          <StravaPanel
            configured={configured}
            account={account}
            statusMessage={strava ? statusMessages[strava] : undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Garmin</CardTitle>
          <p className="text-xs text-muted-foreground">
            Source des données santé (sommeil, HRV, FC repos, poids)
          </p>
        </CardHeader>
        <CardContent>
          <GarminPanel account={garmin} />
        </CardContent>
      </Card>
    </div>
  );
}
