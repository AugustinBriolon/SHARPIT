import { GarminConnect } from "@flow-js/garmin-connect";
import { format } from "date-fns";

export interface GarminTokens {
  oauth1: unknown;
  oauth2: unknown;
}

export interface GarminReadinessFactor {
  key: string;
  percent: number | null;
  feedback: string | null;
}

export interface GarminDailyHealth {
  date: string;
  sleepMinutes: number | null;
  restingHr: number | null;
  hrv: number | null;
  weightKg: number | null;
  readinessScore: number | null;
  readinessLevel: string | null;
  readinessFeedback: string | null;
  readinessFactors: GarminReadinessFactor[] | null;
  hrvStatus: string | null;
  hrvBaselineLow: number | null;
  hrvBaselineHigh: number | null;
  stress: number | null;
  bodyBattery: number | null;
}

type GCClient = InstanceType<typeof GarminConnect>;

export async function loginWithCredentials(
  username: string,
  password: string,
): Promise<{ client: GCClient; tokens: GarminTokens; profile: ProfileInfo }> {
  const client = new GarminConnect({ username, password });
  await client.login();
  const tokens = client.exportToken() as unknown as GarminTokens;
  const profile = await safeProfile(client);
  return { client, tokens, profile };
}

export function clientFromTokens(tokens: GarminTokens): GCClient {
  const client = new GarminConnect({ username: "", password: "" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.loadToken(tokens.oauth1 as any, tokens.oauth2 as any);
  return client;
}

export function currentTokens(client: GCClient): GarminTokens {
  return client.exportToken() as unknown as GarminTokens;
}

interface ProfileInfo {
  displayName: string | null;
  fullName: string | null;
}

async function safeProfile(client: GCClient): Promise<ProfileInfo> {
  try {
    const profile = (await client.getUserProfile()) as {
      displayName?: string;
      fullName?: string;
      userName?: string;
    };
    return {
      displayName: profile.displayName ?? profile.userName ?? null,
      fullName: profile.fullName ?? null,
    };
  } catch {
    return { displayName: null, fullName: null };
  }
}


export interface GarminAthleteThresholds {
  ftpW: number | null;
  lthr: number | null;
  runThresholdPaceSecPerKm: number | null;
  vo2maxRunning: number | null;
  vo2maxCycling: number | null;
}

/**
 * Récupère les seuils de l'athlète depuis Garmin (réglages utilisateur + zones
 * de puissance vélo). Tout est optionnel : un champ absent renvoie `null`.
 */
export async function fetchAthleteThresholds(
  client: GCClient,
): Promise<GarminAthleteThresholds> {
  const result: GarminAthleteThresholds = {
    ftpW: null,
    lthr: null,
    runThresholdPaceSecPerKm: null,
    vo2maxRunning: null,
    vo2maxCycling: null,
  };

  const num = (v: unknown) =>
    typeof v === "number" && !Number.isNaN(v) && v > 0 ? v : null;

  try {
    const settings = (await client.get(
      "https://connectapi.garmin.com/userprofile-service/userprofile/user-settings",
    )) as { userData?: Record<string, unknown> } | null;
    const u = settings?.userData;
    if (u) {
      result.lthr = num(u.lactateThresholdHeartRate);
      result.vo2maxRunning = num(u.vo2MaxRunning);
      result.vo2maxCycling = num(u.vo2MaxCycling);

      // lactateThresholdSpeed : m/s, mais Garmin la renvoie parfois divisée par
      // 10. On normalise : aucune allure seuil de course n'est < 1,5 m/s
      // (~11 min/km), donc on remet à l'échelle dans ce cas.
      let speed = num(u.lactateThresholdSpeed);
      if (speed != null) {
        if (speed < 1.5) speed *= 10;
        result.runThresholdPaceSecPerKm =
          speed > 0 ? Math.round(1000 / speed) : null;
      }
    }
  } catch {
    // réglages indisponibles
  }

  try {
    const power = (await client.get(
      "https://connectapi.garmin.com/biometric-service/powerZones/sport/CYCLING",
    )) as { functionalThresholdPower?: number } | null;
    result.ftpW = num(power?.functionalThresholdPower);
  } catch {
    // pas de zones de puissance
  }

  return result;
}

async function fetchHrv(
  client: GCClient,
  date: Date,
): Promise<number | null> {
  try {
    const dateString = format(date, "yyyy-MM-dd");
    const result = (await client.get(
      `https://connectapi.garmin.com/hrv-service/hrv/${dateString}`,
    )) as { hrvSummary?: { lastNightAvg?: number; weeklyAvg?: number } } | null;
    return result?.hrvSummary?.lastNightAvg ?? null;
  } catch {
    return null;
  }
}

async function fetchSleepMinutes(
  client: GCClient,
  date: Date,
): Promise<number | null> {
  try {
    const sleep = (await client.getSleepDuration(date)) as {
      hours?: number | string;
      minutes?: number | string;
    };
    const h = Number(sleep.hours ?? 0);
    const m = Number(sleep.minutes ?? 0);
    const total = h * 60 + m;
    return total > 0 ? total : null;
  } catch {
    return null;
  }
}

async function fetchRestingHr(
  client: GCClient,
  date: Date,
): Promise<number | null> {
  try {
    const hr = (await client.getHeartRate(date)) as {
      restingHeartRate?: number | null;
    };
    return hr?.restingHeartRate ?? null;
  } catch {
    return null;
  }
}

/**
 * Récupère toutes les vraies pesées sur une période en une seule requête.
 * Garmin ne mesure pas le poids depuis la montre : il provient d'une balance
 * connectée ou d'une saisie manuelle, donc il n'existe que sur certains jours.
 * Retourne une map clé "yyyy-MM-dd" -> poids en kg (pesées réelles uniquement).
 */
export async function fetchWeightRange(
  client: GCClient,
  start: Date,
  end: Date,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const s = format(start, "yyyy-MM-dd");
    const e = format(end, "yyyy-MM-dd");
    const data = (await client.get(
      `https://connectapi.garmin.com/weight-service/weight/range/${s}/${e}?includeAll=true`,
    )) as {
      dailyWeightSummaries?: Array<{
        summaryDate?: string;
        latestWeight?: { weight?: number | null; calendarDate?: string };
      }>;
    } | null;

    for (const day of data?.dailyWeightSummaries ?? []) {
      const grams = day?.latestWeight?.weight;
      const key = day?.summaryDate ?? day?.latestWeight?.calendarDate;
      if (grams != null && !Number.isNaN(grams) && key) {
        map.set(key, Number((grams / 1000).toFixed(1)));
      }
    }
  } catch {
    // pas de données de poids : map vide
  }
  return map;
}

interface ReadinessResult {
  readinessScore: number | null;
  readinessLevel: string | null;
  readinessFeedback: string | null;
  readinessFactors: GarminReadinessFactor[] | null;
}

async function fetchTrainingReadiness(
  client: GCClient,
  date: Date,
): Promise<ReadinessResult> {
  const empty: ReadinessResult = {
    readinessScore: null,
    readinessLevel: null,
    readinessFeedback: null,
    readinessFactors: null,
  };
  try {
    const ds = format(date, "yyyy-MM-dd");
    const raw = (await client.get(
      `https://connectapi.garmin.com/metrics-service/metrics/trainingreadiness/${ds}`,
    )) as Array<Record<string, unknown>> | null;
    const r = Array.isArray(raw) ? raw[0] : null;
    if (!r) return empty;

    const num = (v: unknown) =>
      typeof v === "number" && !Number.isNaN(v) ? v : null;
    const str = (v: unknown) => (typeof v === "string" ? v : null);

    const factors: GarminReadinessFactor[] = [
      { key: "sleep", percent: num(r.sleepScoreFactorPercent), feedback: str(r.sleepScoreFactorFeedback) },
      { key: "hrv", percent: num(r.hrvFactorPercent), feedback: str(r.hrvFactorFeedback) },
      { key: "recoveryTime", percent: num(r.recoveryTimeFactorPercent), feedback: str(r.recoveryTimeFactorFeedback) },
      { key: "acwr", percent: num(r.acwrFactorPercent), feedback: str(r.acwrFactorFeedback) },
      { key: "stressHistory", percent: num(r.stressHistoryFactorPercent), feedback: str(r.stressHistoryFactorFeedback) },
      { key: "sleepHistory", percent: num(r.sleepHistoryFactorPercent), feedback: str(r.sleepHistoryFactorFeedback) },
    ].filter((f) => f.percent != null || f.feedback != null);

    return {
      readinessScore: num(r.score),
      readinessLevel: str(r.level),
      readinessFeedback: str(r.feedbackShort),
      readinessFactors: factors.length ? factors : null,
    };
  } catch {
    return empty;
  }
}

interface HrvStatusResult {
  hrvStatus: string | null;
  hrvBaselineLow: number | null;
  hrvBaselineHigh: number | null;
}

async function fetchHrvStatus(
  client: GCClient,
  date: Date,
): Promise<HrvStatusResult> {
  try {
    const ds = format(date, "yyyy-MM-dd");
    const r = (await client.get(
      `https://connectapi.garmin.com/hrv-service/hrv/${ds}`,
    )) as {
      hrvSummary?: {
        status?: string;
        baseline?: { balancedLow?: number; balancedUpper?: number };
      };
    } | null;
    return {
      hrvStatus: r?.hrvSummary?.status ?? null,
      hrvBaselineLow: r?.hrvSummary?.baseline?.balancedLow ?? null,
      hrvBaselineHigh: r?.hrvSummary?.baseline?.balancedUpper ?? null,
    };
  } catch {
    return { hrvStatus: null, hrvBaselineLow: null, hrvBaselineHigh: null };
  }
}

async function fetchStressAndBattery(
  client: GCClient,
  date: Date,
): Promise<{ stress: number | null; bodyBattery: number | null }> {
  try {
    const ds = format(date, "yyyy-MM-dd");
    const r = (await client.get(
      `https://connectapi.garmin.com/wellness-service/wellness/dailyStress/${ds}`,
    )) as {
      avgStressLevel?: number | null;
      bodyBatteryValuesArray?: Array<Array<number | string>>;
    } | null;

    const stress =
      typeof r?.avgStressLevel === "number" && r.avgStressLevel >= 0
        ? r.avgStressLevel
        : null;

    // Format: [timestamp, statut, niveau, version] -> niveau à l'index 2
    let bodyBattery: number | null = null;
    for (const entry of r?.bodyBatteryValuesArray ?? []) {
      const level = Number(entry?.[2]);
      if (!Number.isNaN(level) && (bodyBattery == null || level > bodyBattery)) {
        bodyBattery = level;
      }
    }

    return { stress, bodyBattery };
  } catch {
    return { stress: null, bodyBattery: null };
  }
}

export async function fetchDailyHealth(
  client: GCClient,
  date: Date,
  weightKg: number | null = null,
): Promise<GarminDailyHealth> {
  const [sleepMinutes, restingHr, hrv, readiness, hrvStatus, stressBattery] =
    await Promise.all([
      fetchSleepMinutes(client, date),
      fetchRestingHr(client, date),
      fetchHrv(client, date),
      fetchTrainingReadiness(client, date),
      fetchHrvStatus(client, date),
      fetchStressAndBattery(client, date),
    ]);

  return {
    date: format(date, "yyyy-MM-dd"),
    sleepMinutes,
    restingHr,
    hrv,
    weightKg,
    readinessScore: readiness.readinessScore,
    readinessLevel: readiness.readinessLevel,
    readinessFeedback: readiness.readinessFeedback,
    readinessFactors: readiness.readinessFactors,
    hrvStatus: hrvStatus.hrvStatus,
    hrvBaselineLow: hrvStatus.hrvBaselineLow,
    hrvBaselineHigh: hrvStatus.hrvBaselineHigh,
    stress: stressBattery.stress,
    bodyBattery: stressBattery.bodyBattery,
  };
}
