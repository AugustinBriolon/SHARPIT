import { Suspense } from 'react';
import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { NutritionScreen } from '@/components/nutrition/nutrition-screen';

export default function NutritionPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <MobileDrillDownHeader title="Nutrition" />
        </div>
      }
    >
      <NutritionScreen />
    </Suspense>
  );
}
