'use client';

import { useAnalysisNotifications } from '@/hooks/use-analysis-notifications';

/**
 * Invisible watcher — mounted once in the app shell so a background analysis
 * announces itself from any page (ADR-036).
 */
export function AnalysisNotifications() {
  useAnalysisNotifications();
  return null;
}
