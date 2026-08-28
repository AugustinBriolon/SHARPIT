import { isSet } from '@/lib/util/value';
export type ThresholdSnapshotLike = {
  id: string;
  createdAt: Date | string;
  source: string;
  ftpW?: number | null;
  lthr?: number | null;
  runThresholdPaceSecPerKm?: number | null;
};

function valuesKey(snapshot: ThresholdSnapshotLike): string {
  return JSON.stringify({
    ftpW: snapshot.ftpW ?? null,
    lthr: snapshot.lthr ?? null,
    runThresholdPaceSecPerKm: snapshot.runThresholdPaceSecPerKm ?? null,
  });
}

export function paceToDisplay(secPerKm: number | null | undefined): string | null {
  if (secPerKm === undefined || secPerKm === null) {
    return null;
  }
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.round(secPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

/** Garde une entrée par combinaison de valeurs distincte (liste la plus récente en premier). */
export function dedupeThresholdHistory(
  snapshots: ThresholdSnapshotLike[],
): ThresholdSnapshotLike[] {
  const deduped: ThresholdSnapshotLike[] = [];
  let previousKey: string | null = null;

  for (const snapshot of snapshots) {
    const key = valuesKey(snapshot);
    if (key !== previousKey) {
      deduped.push(snapshot);
      previousKey = key;
    }
  }

  return deduped;
}

function initialThresholdLabels(newer: ThresholdSnapshotLike): string[] {
  const initial: string[] = [];
  if (isSet(newer.ftpW)) {
    initial.push(`FTP ${newer.ftpW} W`);
  }
  if (isSet(newer.lthr)) {
    initial.push(`FC seuil ${newer.lthr} bpm`);
  }
  const pace = paceToDisplay(newer.runThresholdPaceSecPerKm);
  if (pace) {
    initial.push(`Allure seuil ${pace}`);
  }
  return initial.length > 0 ? initial : ['Seuils enregistrés'];
}

function ftpChangeLabel(
  newer: number | null | undefined,
  older: number | null | undefined,
): string | null {
  if (newer === older) {
    return null;
  }
  if (isSet(newer) && isSet(older)) {
    return `FTP ${older} → ${newer} W`;
  }
  if (isSet(newer)) {
    return `FTP ${newer} W`;
  }
  return null;
}

function lthrChangeLabel(
  newer: number | null | undefined,
  older: number | null | undefined,
): string | null {
  if (newer === older) {
    return null;
  }
  if (isSet(newer) && isSet(older)) {
    return `FC seuil ${older} → ${newer} bpm`;
  }
  if (isSet(newer)) {
    return `FC seuil ${newer} bpm`;
  }
  return null;
}

function paceChangeLabel(
  newer: number | null | undefined,
  older: number | null | undefined,
): string | null {
  if (newer === older) {
    return null;
  }
  const newerPace = paceToDisplay(newer);
  const olderPace = paceToDisplay(older);
  if (newerPace && olderPace) {
    return `Allure seuil ${olderPace} → ${newerPace}`;
  }
  if (newerPace) {
    return `Allure seuil ${newerPace}`;
  }
  return null;
}

export function describeThresholdChanges(
  newer: ThresholdSnapshotLike,
  older: ThresholdSnapshotLike | undefined,
): string[] {
  if (!older) {
    return initialThresholdLabels(newer);
  }

  return [
    ftpChangeLabel(newer.ftpW, older.ftpW),
    lthrChangeLabel(newer.lthr, older.lthr),
    paceChangeLabel(newer.runThresholdPaceSecPerKm, older.runThresholdPaceSecPerKm),
  ].filter((change): change is string => isSet(change));
}
