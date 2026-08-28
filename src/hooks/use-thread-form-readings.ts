'use client';

import { useMemo } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAthleteProfile, useRecords, useThresholdHistory } from '@/hooks/use-data';
import type { ThreadReading } from '@/components/training/thread/thread-form-readings';
import { TWIN_DRILL_DOWN } from '@/lib/today/today-twin-navigation';

/**
 * The three readings that stand behind "am I improving".
 *
 * Deliberately few, and every one of them a door. This replaces a grid of
 * progression tiles where most cards were a number with nowhere to go — and a
 * number with nowhere to go is a number the athlete can do nothing about.
 *
 * A reading is omitted rather than shown empty: "Seuil course · —" tells him his
 * threshold is missing in the least useful place to learn it.
 */

function paceLabel(secPerKm: number): string {
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.round(secPerKm % 60);
  return `${minutes}′${String(seconds).padStart(2, '0')}/km`;
}

function timeLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

type ThresholdSnapshot = NonNullable<ReturnType<typeof useThresholdHistory>['data']>[number];

function thresholdSeries(
  history: ThresholdSnapshot[],
  pick: (snapshot: ThresholdSnapshot) => number | null | undefined,
): Array<number | null> | null {
  const points = history.map((snapshot) => pick(snapshot) ?? null);
  const known = points.filter((value): value is number => value !== null);
  if (known.length < 2) {
    return null;
  }
  if (Math.min(...known) === Math.max(...known)) {
    return null;
  }
  return points;
}

function tenKReading(
  records: NonNullable<ReturnType<typeof useRecords>['data']>,
): ThreadReading | null {
  const tenK = records.runEfforts
    ?.filter((effort) => effort.meters >= 9_500 && effort.meters <= 10_500)
    .sort((a, b) => a.seconds - b.seconds)[0];
  if (!tenK) {
    return null;
  }
  return {
    key: 'run-10k',
    label: 'Record 10 km',
    value: timeLabel(tenK.seconds),
    note: tenK.date
      ? `il y a ${formatDistanceToNowStrict(new Date(tenK.date), { locale: fr })}`
      : null,
    href: TWIN_DRILL_DOWN.records,
  };
}

function buildThreadReadings(
  profile: ReturnType<typeof useAthleteProfile>['data'],
  records: ReturnType<typeof useRecords>['data'],
  history: ThresholdSnapshot[],
): ThreadReading[] {
  const readings: ThreadReading[] = [];

  if (profile?.runThresholdPaceSecPerKm) {
    readings.push({
      key: 'run-threshold',
      label: 'Seuil course',
      value: paceLabel(profile.runThresholdPaceSecPerKm),
      lowerIsBetter: true,
      series: thresholdSeries(history, (snapshot) => snapshot.runThresholdPaceSecPerKm),
      href: TWIN_DRILL_DOWN.calibration,
    });
  }

  if (profile?.ftpW) {
    readings.push({
      key: 'ftp',
      label: 'FTP vélo',
      value: `${profile.ftpW} W`,
      series: thresholdSeries(history, (snapshot) => snapshot.ftpW),
      href: TWIN_DRILL_DOWN.calibration,
    });
  }

  if (records) {
    const tenK = tenKReading(records);
    if (tenK) {
      readings.push(tenK);
    }
  }

  return readings;
}

export function useThreadFormReadings(): ThreadReading[] {
  const profileQuery = useAthleteProfile();
  const recordsQuery = useRecords();
  const historyQuery = useThresholdHistory();

  return useMemo(() => {
    const history = [...(historyQuery.data ?? [])].reverse();
    return buildThreadReadings(profileQuery.data, recordsQuery.data, history);
  }, [profileQuery.data, recordsQuery.data, historyQuery.data]);
}
