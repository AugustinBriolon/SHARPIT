'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { SleepPageView } from '@/components/sleep/sleep-page-view';
import { useAthleteProfile, useHealthEntries } from '@/hooks/use-data';
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
import { format, isSameDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TodaySleepPage() {
  const { data, loading, refresh } = useToday();
  const { recovery } = data;
  const { data: healthEntries = [] } = useHealthEntries(30);
  const { data: athleteProfile } = useAthleteProfile();
  const refreshed = useRef(false);

  useEffect(() => {
    if (!refreshed.current) {
      refreshed.current = true;
      refresh();
    }
  }, [refresh]);

  const today = new Date();

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

  const todayEntry = healthEntries.find((e) => isSameDay(new Date(e.date), today)) ?? null;

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

  const last7 = healthEntries.filter((e) => {
    const d = new Date(e.date);
    return d >= subDays(today, 6) && !isSameDay(d, today) && effectiveSleepMinutes(e) != null;
  });
  const avgSleepMinutes7d =
    last7.length > 0
      ? Math.round(last7.reduce((s, e) => s + (effectiveSleepMinutes(e) ?? 0), 0) / last7.length)
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

  const days14 = Array.from({ length: 14 }, (_, i) => subDays(today, 13 - i));
  const barData = days14.map((d) => {
    const e = healthEntries.find((h) => isSameDay(new Date(h.date), d));
    const mins = e?.sleepMinutes ?? null;
    let fill = '#e2e8f0';
    if (mins !== null) fill = mins >= sleepTargetMin ? '#34d399' : '#fbbf24';
    return { date: format(d, 'dd/MM', { locale: fr }), minutes: mins, fill };
  });

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Sommeil" />
      <SleepPageView
        adequacyDisplay={adequacyDisplay}
        awakeMin={awakeMin}
        barData={barData}
        bedtimeMin={todayEntry?.sleepBedtimeMin ?? null}
        coachView={coachView}
        date={today}
        deepMin={deepMin}
        garminScore={todayEntry?.sleepScore ?? null}
        lightMin={lightMin}
        recoveryNote={recoveryNote}
        remMin={remMin}
        scoreBreakdown={scoreBreakdown}
        sleepDelta7d={sleepDelta7d}
        sleepScore={sleepScore}
        sleepTargetMin={sleepTargetMin}
        targetDeltaMin={targetDeltaMin}
        totalSleepMin={totalSleepMin}
        wakeMin={todayEntry?.sleepWakeMin ?? null}
      />
    </div>
  );
}
