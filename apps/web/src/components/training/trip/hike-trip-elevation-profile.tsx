'use client';

import dynamic from 'next/dynamic';

/**
 * Dynamic recharts elevation chart — keeps the heavy chart out of the initial bundle.
 * Implementation lives in hike-trip-elevation-profile-chart.tsx.
 * Import HikeStepSparkline from the chart module directly (avoids a static recharts edge).
 */
export const HikeTripElevationProfile = dynamic(
  () => import('./hike-trip-elevation-profile-chart').then((mod) => mod.HikeTripElevationProfile),
  { ssr: false },
);
