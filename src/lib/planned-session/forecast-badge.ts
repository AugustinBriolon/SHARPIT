import type { PlannedSessionContext } from '@/core/planned-session/types';

export type PlannedSessionForecastBadge = {
  tone: 'ok' | 'caution' | 'neutral';
  label: string;
};

const THERMAL_SHORT: Record<string, string> = {
  LOW: 'Frais',
  MODERATE: 'Modéré',
  HIGH: 'Chaleur',
  EXTREME: 'Canicule',
  UNKNOWN: 'Incertain',
  NOT_APPLICABLE: 'Intérieur',
};

export function forecastBadgeFromContext(
  context: unknown,
  exposureSetting?: string | null,
): PlannedSessionForecastBadge | null {
  if (exposureSetting === 'INDOOR') {
    return { tone: 'neutral', label: 'Intérieur' };
  }

  if (!context || typeof context !== 'object') return null;
  const parsed = context as PlannedSessionContext;
  const env = parsed.environment;
  const advisories = parsed.advisories ?? [];

  if (advisories.some((a) => a.kind === 'CONFIRM_LOCATION')) {
    // Soft advisory — not a thermal risk; keep neutral so cards stay calm.
    return { tone: 'neutral', label: 'Lieu à préciser' };
  }

  if (!env) {
    return { tone: 'neutral', label: 'Météo N/A' };
  }

  if (env.freshness === 'STALE') {
    return { tone: 'caution', label: 'Prévision à rafraîchir' };
  }

  if (advisories.some((a) => a.kind === 'RAIN_RISK')) {
    return { tone: 'caution', label: 'Pluie probable' };
  }
  if (advisories.some((a) => a.kind === 'COLD_RISK')) {
    return { tone: 'caution', label: 'Froid marqué' };
  }
  if (advisories.some((a) => a.kind === 'REDUCE_INTENSITY' || a.kind === 'HYDRATION')) {
    return {
      tone: 'caution',
      label: THERMAL_SHORT[env.thermalStressLevel] ?? 'Vigilance',
    };
  }

  if (env.thermalStressLevel === 'NOT_APPLICABLE') {
    return { tone: 'neutral', label: 'Intérieur' };
  }

  return {
    tone: 'ok',
    label: THERMAL_SHORT[env.thermalStressLevel] ?? 'OK',
  };
}
