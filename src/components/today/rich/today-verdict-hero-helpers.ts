import type { TodayViewModel } from '@/core/presentation/today-view-model';

export function deriveVerdictHeroDisplay(hero: TodayViewModel['hero']) {
  const priority = hero.focusPriority ?? hero.actionLine;
  const contextLabel = [hero.postureLabel, hero.eyebrow].filter(Boolean).join(' · ') || 'Ce matin';
  const secondaryLine = priority ?? hero.subline ?? null;
  const secondaryMuted = !priority && Boolean(hero.subline);

  return { contextLabel, secondaryLine, secondaryMuted };
}
