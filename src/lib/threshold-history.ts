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
  if (secPerKm == null) return null;
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

export function describeThresholdChanges(
  newer: ThresholdSnapshotLike,
  older: ThresholdSnapshotLike | undefined,
): string[] {
  if (!older) {
    const initial: string[] = [];
    if (newer.ftpW != null) initial.push(`FTP ${newer.ftpW} W`);
    if (newer.lthr != null) initial.push(`FC seuil ${newer.lthr} bpm`);
    const pace = paceToDisplay(newer.runThresholdPaceSecPerKm);
    if (pace) initial.push(`Allure seuil ${pace}`);
    return initial.length > 0 ? initial : ['Seuils enregistrés'];
  }

  const changes: string[] = [];

  if (newer.ftpW !== older.ftpW) {
    if (newer.ftpW != null && older.ftpW != null) {
      changes.push(`FTP ${older.ftpW} → ${newer.ftpW} W`);
    } else if (newer.ftpW != null) {
      changes.push(`FTP ${newer.ftpW} W`);
    }
  }

  if (newer.lthr !== older.lthr) {
    if (newer.lthr != null && older.lthr != null) {
      changes.push(`FC seuil ${older.lthr} → ${newer.lthr} bpm`);
    } else if (newer.lthr != null) {
      changes.push(`FC seuil ${newer.lthr} bpm`);
    }
  }

  if (newer.runThresholdPaceSecPerKm !== older.runThresholdPaceSecPerKm) {
    const newerPace = paceToDisplay(newer.runThresholdPaceSecPerKm);
    const olderPace = paceToDisplay(older.runThresholdPaceSecPerKm);
    if (newerPace && olderPace) {
      changes.push(`Allure seuil ${olderPace} → ${newerPace}`);
    } else if (newerPace) {
      changes.push(`Allure seuil ${newerPace}`);
    }
  }

  return changes;
}
