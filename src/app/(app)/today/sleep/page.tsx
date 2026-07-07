'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { SleepPageView } from '@/components/sleep/sleep-page-view';
import { useAthleteProfile, useHealthEntries } from '@/hooks/use-data';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import {
  buildDailyWindowSeries,
  getIndexedHealthEntry,
  indexHealthEntriesByDay,
} from '@/lib/health';
import { useToday } from '@/hooks/use-today';
import { analyzeSleep, toSleepEntryInputs } from '@/lib/sleep';
import { effectiveSleepMinutes } from '@/lib/health';
import {
  buildSleepScoreBreakdown,
  mapSleepScoreToAdequacy,
  SLEEP_TARGET_MIN,
} from '@/lib/sleep-scoring';
import { mapRecoveryToSignal, mapSleepAdequacySignalToDisplay } from '@/lib/today-mapping';
import type { ReadinessCategory } from '@/lib/today-mapping';
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TodaySleepPage() {
  const { date, isToday, maxDate, setDate, goToNextDay, goToPreviousDay } = useTodaySelectedDate();
  const { data, loading, refresh } = useToday(date);
  const { recovery } = data;
  const { data: healthEntries = [] } = useHealthEntries(30, date);
  const { data: athleteProfile } = useAthleteProfile();
  const refreshed = useRef(false);

  useEffect(() => {
    if (!refreshed.current) {
      refreshed.current = true;
      refresh();
    }
  }, [refresh]);

  const healthByDay = useMemo(() => indexHealthEntriesByDay(healthEntries), [healthEntries]);

  const sleepGoals = useMemo(
    () => ({
      targetDurationMin: athleteProfile?.sleepTargetMinutes ?? null,
      bedtimeTargetMin: athleteProfile?.sleepBedtimeTargetMin ?? null,
    }),
    [athleteProfile?.sleepBedtimeTargetMin, athleteProfile?.sleepTargetMinutes],
  );

  const coachView = useMemo(
    () => analyzeSleep(toSleepEntryInputs(healthEntries), sleepGoals),
    [healthEntries, sleepGoals],
  );

  if (loading) {
    return (
      <div>
        <MobileDrillDownHeader title="Sommeil" />
        <div className="animate-pulse space-y-4 p-4">
          <div className="bg-muted mx-auto h-48 rounded-3xl" />
          <div className="bg-muted mx-auto h-16 rounded-3xl" />
          <div className="bg-muted mx-auto h-40 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!recovery) {
    return (
      <div className="space-y-4">
        <MobileDrillDownHeader title="Sommeil" />
        <p className="text-muted-foreground text-sm">Données de sommeil indisponibles.</p>
      </div>
    );
  }

  const todayEntry = getIndexedHealthEntry(healthByDay, date);

  const deepMin = todayEntry?.sleepDeepMin ?? null;
  const remMin = todayEntry?.sleepRemMin ?? null;
  const lightMin = todayEntry?.sleepLightMin ?? null;
  const totalSleepMin = todayEntry ? effectiveSleepMinutes(todayEntry) : null;
  const awakeMin =
    totalSleepMin != null && deepMin != null && remMin != null && lightMin != null
      ? Math.max(0, totalSleepMin - deepMin - remMin - lightMin)
      : (todayEntry?.sleepAwakeMin ?? null);

  const sleepTargetMin = athleteProfile?.sleepTargetMinutes ?? SLEEP_TARGET_MIN;
  const scoreBreakdown = buildSleepScoreBreakdown(deepMin, remMin, totalSleepMin, null);

  const last7Sleep = buildDailyWindowSeries(
    healthByDay,
    7,
    (d, e) => {
      if (isSameDay(d, date)) return null;
      return e ? effectiveSleepMinutes(e) : null;
    },
    date,
  ).filter((value): value is number => value != null);
  const avgSleepMinutes7d =
    last7Sleep.length > 0
      ? Math.round(last7Sleep.reduce((sum, value) => sum + value, 0) / last7Sleep.length)
      : null;

  const sleepDelta7d =
    totalSleepMin != null && avgSleepMinutes7d != null ? totalSleepMin - avgSleepMinutes7d : null;
  const targetDeltaMin = totalSleepMin != null ? totalSleepMin - sleepTargetMin : null;

  const sleepDim = recovery.dimensions.sleep;
  const sleepScore =
    scoreBreakdown.sharpitScore ?? (sleepDim.available ? (sleepDim.score ?? null) : null);
  const adequacyDisplay = mapSleepAdequacySignalToDisplay(mapSleepScoreToAdequacy(sleepScore));

  const autonomicScore = recovery.dimensions.autonomic.available
    ? recovery.dimensions.autonomic.score
    : null;
  const recoverySignal = mapRecoveryToSignal(recovery.readinessCategory as ReadinessCategory);

  let recoveryNote: string | null = null;
  if (recovery.readinessScore != null) {
    if (autonomicScore != null && sleepScore != null && autonomicScore > sleepScore) {
      recoveryNote = `Récupération ${recovery.readinessScore}/100 (${recoverySignal.label.toLowerCase()}) — la VFC compense partiellement le sommeil.`;
    } else if (recovery.primaryLimitingFactor === 'sleep') {
      recoveryNote = `Récupération ${recovery.readinessScore}/100 — le sommeil est le facteur limitant aujourd'hui.`;
    }
  }

  const barData = buildDailyWindowSeries(
    healthByDay,
    14,
    (d, e) => {
      const mins = e?.sleepMinutes ?? null;
      let fill = '#e2e8f0';
      if (mins !== null) fill = mins >= sleepTargetMin ? '#34d399' : '#fbbf24';
      return { date: format(d, 'dd/MM', { locale: fr }), minutes: mins, fill };
    },
    date,
  );

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Sommeil" />
      <SleepPageView
        adequacyDisplay={adequacyDisplay}
        awakeMin={awakeMin}
        barData={barData}
        bedtimeMin={todayEntry?.sleepBedtimeMin ?? null}
        coachView={coachView}
        date={date}
        deepMin={deepMin}
        garminScore={todayEntry?.sleepScore ?? null}
        isToday={isToday}
        lightMin={lightMin}
        maxDate={maxDate}
        recoveryNote={recoveryNote}
        remMin={remMin}
        scoreBreakdown={scoreBreakdown}
        sleepDelta7d={sleepDelta7d}
        sleepScore={sleepScore}
        sleepTargetMin={sleepTargetMin}
        targetDeltaMin={targetDeltaMin}
        totalSleepMin={totalSleepMin}
        wakeMin={todayEntry?.sleepWakeMin ?? null}
        onDateChange={setDate}
        onNextDay={goToNextDay}
        onPreviousDay={goToPreviousDay}
      />
    </div>
  );
}
