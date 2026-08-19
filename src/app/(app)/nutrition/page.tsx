import { Suspense } from 'react';
import { NutritionHub } from '@/components/nutrition/nutrition-hub';

export default function NutritionPage() {
  return (
    <Suspense>
      <NutritionHub />
    </Suspense>
  );
}
