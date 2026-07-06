/** WHOOP Strain scale — 0 to 21 (logarithmic day load). */

export const WHOOP_STRAIN_MAX = 21;

export type StrainZone = 'light' | 'moderate' | 'high' | 'all_out';

export type StrainZoneInfo = {
  zone: StrainZone;
  label: string;
  color: string;
  range: string;
};

/**
 * Maps SHARPIT fatigue index (0–100) to a WHOOP-like strain score (0–21).
 * Logarithmic curve: reaching high strain requires disproportionate load,
 * similar to WHOOP's day strain algorithm.
 */
export function fatigueIndexToWhoopStrain(fatigueIndex: number | null): number | null {
  if (fatigueIndex === null) return null;
  const t = Math.max(0, Math.min(100, fatigueIndex)) / 100;
  const strain = WHOOP_STRAIN_MAX * (Math.log1p(t * (Math.E - 1)) / Math.log(Math.E));
  return Math.round(strain * 10) / 10;
}

/** WHOOP strain zones — https://www.whoop.com/fr/fr/thelocker/how-does-whoop-strain-work-101/ */
export function getStrainZone(strain: number): StrainZoneInfo {
  if (strain < 10) {
    return { zone: 'light', label: 'Léger', color: '#7BA3B8', range: '0–9' };
  }
  if (strain < 14) {
    return { zone: 'moderate', label: 'Modéré', color: '#16A34A', range: '10–13' };
  }
  if (strain < 18) {
    return { zone: 'high', label: 'Élevé', color: '#D97706', range: '14–17' };
  }
  return { zone: 'all_out', label: 'Maximal', color: '#DC2626', range: '18–21' };
}
