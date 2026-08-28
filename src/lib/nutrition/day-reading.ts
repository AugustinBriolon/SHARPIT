import type {
  NutritionDaySummary,
  NutritionGoalsProgress,
} from '@/core/presentation/nutrition-view-model';

export type NutritionDayReading = {
  headline: string;
  caption: string | null;
};

const EXPECTED_MEALS = [
  { key: 'breakfast', label: 'petit-déjeuner' },
  { key: 'lunch', label: 'déjeuner' },
  { key: 'dinner', label: 'dîner' },
  { key: 'snacks', label: 'collation' },
] as const;

function loggedMealKeys(day: NutritionDaySummary): Set<string> {
  return new Set(
    day.meals.filter((meal) => meal.calories > 0).map((meal) => meal.name.trim().toLowerCase()),
  );
}

function missingMealLabels(day: NutritionDaySummary): string[] {
  const logged = loggedMealKeys(day);
  return EXPECTED_MEALS.filter((meal) => !logged.has(meal.key)).map((meal) => meal.label);
}

function formatMissingMeals(labels: string[]): string | null {
  if (labels.length === 0) {
    return null;
  }
  if (labels.length === 1) {
    const label = labels[0].charAt(0).toUpperCase() + labels[0].slice(1);
    return `${label} absent du journal`;
  }
  if (labels.length === 2) {
    const first = labels[0].charAt(0).toUpperCase() + labels[0].slice(1);
    return `${first} et ${labels[1]} absents du journal`;
  }
  return 'Plusieurs repas non renseignés';
}

function dominantMealInsight(day: NutritionDaySummary): string | null {
  if (day.calories <= 0 || day.meals.length === 0) {
    return null;
  }

  const activeMeals = day.meals.filter((meal) => meal.calories > 0);
  if (activeMeals.length < 2) {
    return null;
  }

  const top = activeMeals.reduce((best, meal) => (meal.calories > best.calories ? meal : best));
  const share = top.calories / day.calories;

  if (share >= 0.5) {
    return `La moitié des apports au ${top.label.toLowerCase()}`;
  }
  if (share >= 0.42) {
    return `Gros apport au ${top.label.toLowerCase()}`;
  }
  return null;
}

function proteinMealInsight(day: NutritionDaySummary): string | null {
  if (day.protein <= 0 || day.meals.length === 0) {
    return null;
  }

  const activeMeals = day.meals.filter((meal) => meal.protein > 0);
  if (activeMeals.length < 2) {
    return null;
  }

  const top = activeMeals.reduce((best, meal) => (meal.protein > best.protein ? meal : best));
  const share = top.protein / day.protein;

  if (share >= 0.55) {
    return `Protéines surtout au ${top.label.toLowerCase()}`;
  }
  return null;
}

function calorieGoalHeadline(remaining: number | null): string | null {
  if (remaining !== null && remaining < 0) {
    return remaining < -200 ? 'Apports généreux' : 'Légèrement au-dessus';
  }
  if (remaining === 0) {
    return 'Objectif calorique atteint';
  }
  return null;
}

function todayProgressHeadline(
  isToday: boolean,
  missingCount: number,
  loggedCount: number,
  complete: boolean,
): string | null {
  if (isToday && missingCount >= 2 && loggedCount <= 2) {
    return 'Journal incomplet';
  }
  if (isToday && loggedCount > 0 && !complete) {
    return 'Journal en cours';
  }
  return null;
}

function ratioProgressHeadline(
  consumedRatio: number,
  proteinOver: boolean,
  isToday: boolean,
): string | null {
  if (proteinOver && consumedRatio >= 0.75) {
    return 'Bonne couverture protéique';
  }
  if (consumedRatio >= 0.85) {
    return 'Journée bien avancée';
  }
  if (consumedRatio < 0.35 && isToday) {
    return 'Journée légère';
  }
  return null;
}

function progressGoalHeadline(input: {
  consumedRatio: number;
  proteinOver: boolean;
  isToday: boolean;
  missingCount: number;
  loggedCount: number;
  complete: boolean;
}): string | null {
  return (
    ratioProgressHeadline(input.consumedRatio, input.proteinOver, input.isToday) ??
    todayProgressHeadline(input.isToday, input.missingCount, input.loggedCount, input.complete)
  );
}

function headlineWithGoals(
  day: NutritionDaySummary,
  goals: NutritionGoalsProgress,
  isToday: boolean,
): string {
  const calorieHeadline = calorieGoalHeadline(goals.calories.remaining);
  if (calorieHeadline) {
    return calorieHeadline;
  }
  if (day.complete) {
    return 'Journée couverte';
  }

  const consumedRatio = goals.calorieBudget > 0 ? goals.calories.consumed / goals.calorieBudget : 0;
  const progressHeadline = progressGoalHeadline({
    consumedRatio,
    proteinOver: goals.protein.remaining !== null && goals.protein.remaining < 0,
    isToday,
    missingCount: missingMealLabels(day).length,
    loggedCount: day.meals.filter((meal) => meal.calories > 0).length,
    complete: day.complete,
  });
  return progressHeadline ?? 'Apports en bonne voie';
}

function journalCaptionToday(loggedCount: number, missing: string[], isToday: boolean): string | null {
  if (loggedCount === 1 && isToday) {
    return "Un seul repas enregistré pour l'instant";
  }
  if (isToday && missing.length > 0 && missing.length <= 2) {
    return formatMissingMeals(missing);
  }
  return null;
}

function journalCaption(
  day: NutritionDaySummary,
  isToday: boolean,
  headline: string,
): string | null {
  const missing = missingMealLabels(day);
  const loggedCount = day.meals.filter((meal) => meal.calories > 0).length;
  const todayCaption = journalCaptionToday(loggedCount, missing, isToday);
  if (todayCaption) {
    return todayCaption;
  }

  const dominant = dominantMealInsight(day);
  if (dominant) {
    return dominant;
  }

  if (!/protéin/i.test(headline)) {
    const protein = proteinMealInsight(day);
    if (protein) {
      return protein;
    }
  }

  const entryCount = day.meals.reduce((sum, meal) => sum + meal.entries.length, 0);
  if (entryCount >= 10) {
    return `Journal détaillé — ${entryCount} aliments`;
  }

  if (day.complete && missing.length === 0) {
    return 'Quatre repas couverts sur la journée';
  }

  return null;
}

function headlineWithoutGoals(day: NutritionDaySummary, isToday: boolean): string {
  if (day.complete) {
    return 'Journée couverte';
  }
  if (day.meals.length > 0) {
    return isToday ? 'Journal en cours' : 'Repas enregistrés';
  }
  return isToday ? 'Journal vide' : 'Aucune donnée';
}

export function buildNutritionDayReading(
  day: NutritionDaySummary | null,
  isToday: boolean,
): NutritionDayReading {
  if (!day || day.meals.length === 0) {
    return {
      headline: isToday ? 'Journal vide' : 'Aucune donnée',
      caption: null,
    };
  }

  const headline = day.goalsProgress
    ? headlineWithGoals(day, day.goalsProgress, isToday)
    : headlineWithoutGoals(day, isToday);

  return {
    headline,
    caption: journalCaption(day, isToday, headline),
  };
}
