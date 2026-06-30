import { generateText, Output } from "ai";
import { COACH_MODEL, coachGatewayOptions } from "./ai";
import {
  categoryLabels,
  sideLabels,
  statusLabels,
} from "./physical";
import {
  getActivePhysicalNotes,
  getAthleteProfile,
  getBrickSessions,
  getPlannedSessionById,
} from "./queries";
import { intensityLabels } from "./sessions";
import { fetchActivityDetail } from "./strava";
import { getValidAccessToken } from "./strava-sync";
import {
  brickAnalysisSchema,
  sessionAnalysisSchema,
  type BrickAnalysis,
  type SessionAnalysis,
} from "./validators/coach";

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
    p.brickGroupId
      ? `Jambe d'un BRICK (enchaînement multisport) — tiens compte de la fatigue/transition (ex. course en sortie de vélo).`
      : null,
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

type ActivePhysicalNote = Awaited<
  ReturnType<typeof getActivePhysicalNotes>
>[number];

function describePhysicalNotes(notes: ActivePhysicalNote[]): string {
  if (notes.length === 0) {
    return "Aucune douleur / blessure active enregistrée — ne propose aucune réévaluation.";
  }
  return notes
    .map((n) => {
      const bits = [
        `id=${n.id}`,
        `${categoryLabels[n.category]} : ${n.title}`,
        n.bodyPart
          ? `zone ${n.bodyPart}${n.side && n.side !== "NA" ? ` (${sideLabels[n.side]})` : ""}`
          : null,
        n.severity != null ? `sévérité actuelle ${n.severity}/10` : null,
        `statut ${statusLabels[n.status]}`,
      ].filter(Boolean);
      return `- ${bits.join(" · ")}`;
    })
    .join("\n");
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

RÉÉVALUATION DU SUIVI PHYSIQUE (champ "physicalReassessments") :
- On te fournit la liste des douleurs / blessures ACTIVES de l'athlète, chacune avec son id.
- Propose une réévaluation UNIQUEMENT lorsque la consigne de la séance OU les notes/description de l'athlète sollicitent ou mentionnent explicitement la zone concernée (ex. test ciblant une douleur, consigne « arrêt immédiat si douleur fesse/ischio », gêne rapportée pendant la séance).
- Pour chaque réévaluation pertinente : recopie l'id EXACT de la note, pose une question courte et ciblée sur le ressenti pendant cette séance précise, et pré-remplis un commentaire rappelant le contexte (type de test, structure).
- Ne renseigne "suggestedSeverity" QUE si l'athlète a explicitement indiqué l'état de sa douleur dans ses notes/ressenti ; sinon mets null (c'est lui qui complétera).
- Si aucune douleur active n'est concernée par cette séance, laisse "physicalReassessments" vide.

Sois précis, bienveillant et concis. Réponds en français.`;

/** Description libre Strava (détail réel). Best-effort : ne lève jamais. */
async function fetchStravaDescription(
  activity: LinkedActivity,
): Promise<string | null> {
  if (activity.source !== "strava" || !activity.stravaId) return null;
  try {
    const token = await getValidAccessToken();
    const detail = await fetchActivityDetail(token, activity.stravaId);
    return detail?.description ?? detail?.private_note ?? null;
  } catch (error) {
    console.error("[analyze] description Strava non récupérée", error);
    return null;
  }
}

export async function analyzePlannedSession(
  id: string,
): Promise<SessionAnalysis | null> {
  const planned = await getPlannedSessionById(id);
  if (!planned || !planned.activity) return null;

  const stravaDescription = await fetchStravaDescription(planned.activity);

  const [profile, physicalNotes] = await Promise.all([
    getAthleteProfile(),
    getActivePhysicalNotes(),
  ]);
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
${describeActual(planned.activity, stravaDescription)}

# Suivi physique actif de l'athlète
${describePhysicalNotes(physicalNotes)}`;

  const { output } = await generateText({
    model: COACH_MODEL,
    output: Output.object({ schema: sessionAnalysisSchema }),
    system: ANALYSIS_SYSTEM,
    prompt,
    providerOptions: coachGatewayOptions,
  });

  return output;
}

const BRICK_SYSTEM = `Tu es un entraîneur expert en triathlon et en sports d'enchaînement (brick). On te donne un enchaînement multisport (ex. vélo → course) avec, pour chaque sport, ce qui était PRÉVU et ce qui a été RÉELLEMENT réalisé, dans l'ordre.

Analyse l'enchaînement DANS SON ENSEMBLE, pas chaque sport isolément :
- overallScore : 0-100, qualité globale d'exécution du brick (respect des consignes ET gestion de l'enchaînement).
- summary : synthèse globale en 1-2 phrases.
- transition : LE point clé. Évalue l'enchaînement entre les sports : dérive cardiaque entre la fin d'un sport et le début du suivant, perte d'allure/puissance en sortie de vélo (jambes « lourdes »), capacité à retrouver son rythme cible dans les premières minutes. Appuie-toi sur les chiffres (FC, allure, puissance) et sur les temps de transition fournis.
- remarks : remarques factuelles et exploitables sur l'ensemble.
- recommendation : un conseil concret pour mieux réussir les prochains bricks.

Réponds en français, sois précis et concis.`;

function fmtClock(d: Date): string {
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Analyse GLOBALE d'un brick : agrège les jambes (prévu + réalisé) et évalue
 * les transitions (dérive FC, sortie de vélo). Renvoie null si le brick n'a pas
 * au moins 2 jambes toutes liées à une activité réalisée.
 */
export async function analyzeBrick(
  brickGroupId: string,
): Promise<BrickAnalysis | null> {
  const legs = await getBrickSessions(brickGroupId);
  if (legs.length < 2) return null;
  if (legs.some((l) => !l.activity)) return null;

  const [profile, descriptions] = await Promise.all([
    getAthleteProfile(),
    Promise.all(legs.map((l) => fetchStravaDescription(l.activity!))),
  ]);

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

  const legBlocks = legs.map((leg, i) => {
    const a = leg.activity!;
    const header = `## Sport ${i + 1} : ${TYPE_FR[leg.type] ?? leg.type}`;
    return `${header}
### Prévu
${describePlanned(leg)}
### Réalisé
${describeActual(a, descriptions[i])}`;
  });

  // Temps de transition entre la fin d'un sport et le début du suivant
  // (estimé à partir de l'heure de départ et de la durée de chaque activité).
  const transitions: string[] = [];
  for (let i = 1; i < legs.length; i++) {
    const prev = legs[i - 1].activity!;
    const curr = legs[i].activity!;
    if (prev.duration == null) continue;
    const prevEnd = new Date(
      new Date(prev.date).getTime() + prev.duration * 1000,
    );
    const currStart = new Date(curr.date);
    const gapMin = Math.round(
      (currStart.getTime() - prevEnd.getTime()) / 60000,
    );
    const label = `${TYPE_FR[legs[i - 1].type]} → ${TYPE_FR[legs[i].type]}`;
    if (gapMin >= 0 && gapMin <= 120) {
      transitions.push(
        `${label} : ~${gapMin} min entre la fin (${fmtClock(prevEnd)}) et le départ suivant (${fmtClock(currStart)}).`,
      );
    } else {
      transitions.push(
        `${label} : transition non déterminable de façon fiable (sports peut-être non enregistrés à la suite).`,
      );
    }
  }

  const prompt = `${seuils ? `Seuils de l'athlète : ${seuils}.\n\n` : ""}# Brick : ${legs.length} sports enchaînés (${legs.map((l) => TYPE_FR[l.type] ?? l.type).join(" → ")})

${legBlocks.join("\n\n")}

# Transitions estimées
${transitions.length ? transitions.join("\n") : "Aucune donnée de transition exploitable."}`;

  const { output } = await generateText({
    model: COACH_MODEL,
    output: Output.object({ schema: brickAnalysisSchema }),
    system: BRICK_SYSTEM,
    prompt,
    providerOptions: coachGatewayOptions,
  });

  return output;
}
