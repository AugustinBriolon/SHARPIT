'use client';

import { useMemo } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAthleteProfile, useRecords } from '@/hooks/use-data';
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

export function useThreadFormReadings(): ThreadReading[] {
  const profileQuery = useAthleteProfile();
  const recordsQuery = useRecords();

  return useMemo(() => {
    const readings: ThreadReading[] = [];
    const profile = profileQuery.data;

    if (profile?.runThresholdPaceSecPerKm) {
      readings.push({
        key: 'run-threshold',
        label: 'Seuil course',
        value: paceLabel(profile.runThresholdPaceSecPerKm),
        href: TWIN_DRILL_DOWN.calibration,
      });
    }

    if (profile?.ftpW) {
      readings.push({
        key: 'ftp',
        label: 'FTP vélo',
        value: `${profile.ftpW} W`,
        href: TWIN_DRILL_DOWN.calibration,
      });
    }

    /* The 10 km is the effort most athletes recognise as a benchmark, and the one
       most likely to exist — a marathon PR on a 4-week window would be absent. */
    const tenK = recordsQuery.data?.runEfforts
      ?.filter((effort) => effort.meters >= 9_500 && effort.meters <= 10_500)
      .sort((a, b) => a.seconds - b.seconds)[0];

    if (tenK) {
      readings.push({
        key: 'run-10k',
        label: 'Record 10 km',
        value: timeLabel(tenK.seconds),
        note: tenK.date
          ? `il y a ${formatDistanceToNowStrict(new Date(tenK.date), { locale: fr })}`
          : null,
        href: TWIN_DRILL_DOWN.records,
      });
    }

    return readings;
  }, [profileQuery.data, recordsQuery.data]);
}
