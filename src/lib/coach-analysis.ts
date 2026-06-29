import { generateText, Output } from "ai";
import { COACH_MODEL, coachGatewayOptions } from "./ai";
import { getAthleteProfile, getPlannedSessionById } from "./queries";
import { intensityLabels } from "./sessions";
import { fetchActivityDetail } from "./strava";
import { getValidAccessToken } from "./strava-sync";
import { sessionAnalysisSchema, type SessionAnalysis } from "./validators/coach";

const TYPE_FR: Record<string, string> = {
  RUN: "Course",
  BIKE: "Vélo",
  SWIM: "Natation",
  STRENGTH: "Renfo",
};

function fmtPace(secPerKm?: number | null): string | null {
  if (secPerKm == null || secPerKm <= 0) return null;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

type PlannedWithActivity = NonNullable<
  Awaited<ReturnType<typeof getPlannedSessionById>>
>;
type LinkedActivity = NonNullable<PlannedWithActivity["activity"]>;

function describePlanned(p: PlannedWithActivity): string {
  const bits = [
    `Sport : ${TYPE_FR[p.type] ?? p.type}`,
    p.intensity ? `Intensité prévue : ${intensityLabels[p.intensity]}` : null,
    p.durationMin != null ? `Durée prévue : ${p.durationMin} min` : null,
    p.load != null ? `Charge prévue : ${Math.round(p.load)} TSS` : null,
    p.title ? `Titre : ${p.title}` : null,
    p.description ? `Consigne : ${p.description}` : null,
  ].filter(Boolean);
  return bits.join("\n");
}

function describeActual(a: LinkedActivity, description?: string | null): string {
  const bits: string[] = [
    `Sport : ${TYPE_FR[a.type] ?? a.type}`,
    a.duration != null ? `Durée : ${Math.round(a.duration / 60)} min` : null,
    a.load != null ? `Charge : ${Math.round(a.load)} TSS` : null,
    a.rpe != null ? `RPE ressenti : ${a.rpe}/10` : null,
    a.feeling ? `Ressenti : ${a.feeling}` : null,
    a.notes ? `Notes : ${a.notes}` : null,
  ].filter(Boolean) as string[];

  // Description libre saisie sur Strava (souvent le détail réel des exercices).
  const desc = description?.trim();
  if (desc) bits.push(`Description (athlète) : ${desc}`);

  if (a.runMetrics) {
    const r = a.runMetrics;
    if (r.distanceM) bits.push(`Distance : ${(r.distanceM / 1000).toFixed(2)} km`);
    const pace = fmtPace(r.paceSecPerKm);
    if (pace) bits.push(`Allure moyenne : ${pace}`);
    if (r.avgHr) bits.push(`FC moyenne : ${r.avgHr} bpm`);
    if (r.avgPower) bits.push(`Puissance moyenne : ${Math.round(r.avgPower)} W`);
    if (r.elevationM) bits.push(`D+ : ${Math.round(r.elevationM)} m`);
  }
  if (a.bikeMetrics) {
    const b = a.bikeMetrics;
    if (b.avgPower) bits.push(`Puissance moyenne : ${Math.round(b.avgPower)} W`);
    if (b.normalizedPower)
      bits.push(`NP : ${Math.round(b.normalizedPower)} W`);
    if (b.intensityFactor) bits.push(`IF : ${b.intensityFactor.toFixed(2)}`);
    if (b.tss) bits.push(`TSS : ${Math.round(b.tss)}`);
    if (b.elevationM) bits.push(`D+ : ${Math.round(b.elevationM)} m`);
  }
  if (a.swimMetrics) {
    const s = a.swimMetrics;
    if (s.distanceM) bits.push(`Distance : ${s.distanceM} m`);
    if (s.avgPaceSecPer100m) {
      const m = Math.floor(s.avgPaceSecPer100m / 60);
      const sec = Math.round(s.avgPaceSecPer100m % 60);
      bits.push(`Allure : ${m}:${sec.toString().padStart(2, "0")}/100m`);
    }
  }
  return bits.join("\n");
}

const ANALYSIS_SYSTEM = `Tu es un entraîneur expert en endurance. On te donne une séance PRÉVUE et la séance RÉELLEMENT réalisée (données objectives Strava/Garmin + éventuelle description libre de l'athlète).

Compare-les et produis une analyse exploitable :
- complianceScore : 0-100 (100 = exécution parfaite de la consigne).
- verdict : conforme / plus dur / plus facile / plus court / plus long / différent.
- Remarques pertinentes et factuelles (intensité, durée, allure/puissance, dérive cardiaque, exécution des intervalles). Appuie-toi sur les chiffres.
- Une recommandation concrète à retenir.

RÈGLES D'ÉVALUATION IMPORTANTES :
- Le contenu RÉELLEMENT effectué prime sur les seules métriques. Lis attentivement la "Description (athlète)" et les "Notes" : si l'athlète y indique avoir fait tout le travail prévu, considère la séance comme conforme même si la durée enregistrée diffère.
- Pour la MUSCULATION / le renforcement : la durée chronométrée n'est PAS un bon indicateur de conformité (temps de repos, montre lancée/arrêtée à des moments variables, exercices non détaillés sur la montre). Ne pénalise PAS le score pour un simple écart de durée si le contenu prévu (exercices, séries, répétitions) a été réalisé. Base-toi sur le travail décrit, pas sur les minutes.
- Pour les séances d'endurance/intervalles, la durée et l'intensité restent des indicateurs valides.
- Dans le doute, accorde le bénéfice à l'athlète plutôt que de surpénaliser.

Sois précis, bienveillant et concis. Réponds en français.`;

export async function analyzePlannedSession(
  id: string,
): Promise<SessionAnalysis | null> {
  const planned = await getPlannedSessionById(id);
  if (!planned || !planned.activity) return null;

  // Récupère la description libre saisie sur Strava (détail réel de la séance),
  // absente de la synchro de base. Best-effort : n'échoue pas l'analyse.
  let stravaDescription: string | null = null;
  const activity = planned.activity;
  if (activity.source === "strava" && activity.stravaId) {
    try {
      const token = await getValidAccessToken();
      const detail = await fetchActivityDetail(token, activity.stravaId);
      stravaDescription = detail?.description ?? detail?.private_note ?? null;
    } catch (error) {
      console.error("[analyze] description Strava non récupérée", error);
    }
  }

  const profile = await getAthleteProfile();
  const seuils = profile
    ? [
        profile.ftpW != null ? `FTP ${profile.ftpW} W` : null,
        profile.lthr != null ? `LTHR ${profile.lthr} bpm` : null,
        profile.maxHr != null ? `FC max ${profile.maxHr} bpm` : null,
        fmtPace(profile.runThresholdPaceSecPerKm)
          ? `allure seuil ${fmtPace(profile.runThresholdPaceSecPerKm)}`
          : null,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const prompt = `${seuils ? `Seuils de l'athlète : ${seuils}.\n\n` : ""}# Séance PRÉVUE
${describePlanned(planned)}

# Séance RÉALISÉE
${describeActual(planned.activity, stravaDescription)}`;

  const { output } = await generateText({
    model: COACH_MODEL,
    output: Output.object({ schema: sessionAnalysisSchema }),
    system: ANALYSIS_SYSTEM,
    prompt,
    providerOptions: coachGatewayOptions,
  });

  return output;
}
