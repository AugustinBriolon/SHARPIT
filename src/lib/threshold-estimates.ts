import type { AthleteProfile } from "@prisma/client";
import {
  estimateFtp,
  estimateRunThresholdPace,
  fmtPaceSecPerKm,
} from "./performance-predictor";
import type { RecordsPayload } from "./records";

export interface ThresholdEstimates {
  ftpW: number | null;
  ftpSource: string | null;
  runThresholdPaceSecPerKm: number | null;
}

export function computeThresholdEstimates(
  records: RecordsPayload,
): ThresholdEstimates {
  const ftp = estimateFtp(records.powerCurve);
  const pace = estimateRunThresholdPace(records.runBests);
  return {
    ftpW: ftp?.watts ?? null,
    ftpSource: ftp?.source ?? null,
    runThresholdPaceSecPerKm: pace,
  };
}

export interface ThresholdApplyPreview {
  estimates: ThresholdEstimates;
  current: {
    ftpW: number | null;
    runThresholdPaceSecPerKm: number | null;
  };
  changes: {
    field: "ftpW" | "runThresholdPaceSecPerKm";
    label: string;
    from: string;
    to: string;
  }[];
  hasChanges: boolean;
}

function fmtFtp(w: number | null): string {
  return w != null ? `${w} W` : "—";
}

/** Compare les estimations aux seuils actuels du profil. */
export function previewThresholdApply(
  records: RecordsPayload,
  profile: Pick<
    AthleteProfile,
    "ftpW" | "runThresholdPaceSecPerKm"
  > | null,
): ThresholdApplyPreview {
  const estimates = computeThresholdEstimates(records);
  const current = {
    ftpW: profile?.ftpW ?? null,
    runThresholdPaceSecPerKm: profile?.runThresholdPaceSecPerKm ?? null,
  };

  const changes: ThresholdApplyPreview["changes"] = [];

  if (
    estimates.ftpW != null &&
    estimates.ftpW !== current.ftpW
  ) {
    changes.push({
      field: "ftpW",
      label: "FTP vélo",
      from: fmtFtp(current.ftpW),
      to: fmtFtp(estimates.ftpW),
    });
  }

  if (
    estimates.runThresholdPaceSecPerKm != null &&
    estimates.runThresholdPaceSecPerKm !== current.runThresholdPaceSecPerKm
  ) {
    changes.push({
      field: "runThresholdPaceSecPerKm",
      label: "Allure seuil",
      from: current.runThresholdPaceSecPerKm
        ? fmtPaceSecPerKm(current.runThresholdPaceSecPerKm)
        : "—",
      to: fmtPaceSecPerKm(estimates.runThresholdPaceSecPerKm),
    });
  }

  return { estimates, current, changes, hasChanges: changes.length > 0 };
}
