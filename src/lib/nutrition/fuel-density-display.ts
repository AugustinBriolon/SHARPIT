import type { FuelFeatureSet } from '@/core/features/types';
import type { NutritionFuelDensity } from '@/core/presentation/nutrition-view-model';
import { formatWeightKgDisplay } from '@/lib/health/body-composition';

export function fuelFeatureSetToDensity(fuel: FuelFeatureSet): NutritionFuelDensity | null {
  if (!fuel.logged) {
    return null;
  }
  if (fuel.referenceWeightKg === null || fuel.referenceWeightKg <= 0) {
    return null;
  }
  if (fuel.proteinGPerKg === null && fuel.carbohydratesGPerKg === null) {
    return null;
  }

  return {
    proteinGPerKg: fuel.proteinGPerKg ?? 0,
    carbohydratesGPerKg: fuel.carbohydratesGPerKg ?? 0,
    referenceWeightKg: fuel.referenceWeightKg,
  };
}

export function formatMacroGPerKg(value: number): string {
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatFuelDensityReference(weightKg: number): string {
  const display = formatWeightKgDisplay(weightKg).replace('.', ',');
  return `Réf. ${display} kg · dernière pesée`;
}
