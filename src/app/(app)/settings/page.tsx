import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StickyHeader } from "@/components/layout/sticky-header";
import { AthleteProfilePanel } from "@/components/settings/athlete-profile-panel";
import { GarminPanel } from "@/components/settings/garmin-panel";
import { GoogleCalendarPanel } from "@/components/settings/google-calendar-panel";
import { StravaPanel } from "@/components/settings/strava-panel";
import { getAthleteProfile } from "@/lib/queries";
import { getGarminAccount } from "@/lib/garmin-sync";
import { isGoogleConfigured } from "@/lib/google";
import { getGoogleAccount } from "@/lib/google-sync";
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

const googleStatusMessages: Record<string, string> = {
  connected: "Google Calendar connecté.",
  denied: "Connexion refusée sur Google.",
  invalid_state: "Session expirée, réessaie la connexion.",
  no_refresh:
    "Google n'a pas renvoyé de jeton de rafraîchissement. Réessaie en autorisant l'accès hors-ligne.",
  error: "Une erreur est survenue lors de la connexion à Google.",
};

type PageProps = {
  searchParams: Promise<{ strava?: string; google?: string; google_detail?: string }>;
};

export default async function SettingsPage({ searchParams }: PageProps) {
  const { strava, google, google_detail } = await searchParams;
  const [
    stravaAccount,
    configured,
    garminAccount,
    athleteProfile,
    googleAccount,
    googleConfigured,
  ] = await Promise.all([
    getStravaAccount(),
    Promise.resolve(isStravaConfigured()),
    getGarminAccount(),
    getAthleteProfile().catch(() => null),
    getGoogleAccount().catch(() => null),
    Promise.resolve(isGoogleConfigured()),
  ]);

  const google_ = googleAccount
    ? {
        email: googleAccount.email,
        targetCalendarId: googleAccount.targetCalendarId,
        targetCalendarName: googleAccount.targetCalendarName,
        lastSyncAt: googleAccount.lastSyncAt?.toISOString() ?? null,
      }
    : null;

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
    <div className="space-y-6">
      <StickyHeader>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Settings
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          Réglages
        </h1>
        <p className="mt-1 text-muted-foreground">
          Connecte tes sources de données et configure ton système.
        </p>
      </StickyHeader>

      <Card>
        <CardHeader>
          <CardTitle>Profil athlète</CardTitle>
          <p className="text-xs text-muted-foreground">
            Seuils pour zones FC/puissance, IF, TSS et découplage
          </p>
        </CardHeader>
        <CardContent>
          <AthleteProfilePanel
            initial={
              athleteProfile
                ? {
                    ftpW: athleteProfile.ftpW,
                    maxHr: athleteProfile.maxHr,
                    lthr: athleteProfile.lthr,
                    runThresholdPaceSecPerKm:
                      athleteProfile.runThresholdPaceSecPerKm,
                    vo2maxRunning: athleteProfile.vo2maxRunning,
                    vo2maxCycling: athleteProfile.vo2maxCycling,
                    thresholdsSyncedAt:
                      athleteProfile.thresholdsSyncedAt?.toISOString() ?? null,
                  }
                : null
            }
          />
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle>Google Calendar</CardTitle>
          <p className="text-xs text-muted-foreground">
            Le coach planifie tes séances dans ton agenda en évitant tes
            créneaux occupés
          </p>
        </CardHeader>
        <CardContent>
          <GoogleCalendarPanel
            configured={googleConfigured}
            account={google_}
            statusMessage={
              google
                ? [
                    googleStatusMessages[google],
                    google === "error" && google_detail
                      ? `Détail : ${google_detail}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" ")
                : undefined
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
