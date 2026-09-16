/** UI scale shared by every morning wellness dimension (continuous 1–5). */
export const WELLNESS_UI_SCALE = [1, 2, 3, 4, 5] as const;

export type WellnessUiScore = (typeof WELLNESS_UI_SCALE)[number];

/**
 * Maps the athlete-facing 1–5 soreness pick onto the domain 0–10 scale
 * used by recovery extractors (Core frozen). Linear: 1→0 … 5→10.
 */
export function mapSorenessUiToDomain(uiScore: WellnessUiScore): number {
  return Math.round(((uiScore - 1) * 10) / 4);
}

/**
 * Inverse of {@link mapSorenessUiToDomain} for hydrate on edit open.
 * Clamps to 0–10 then snaps back onto the 1–5 UI tiles.
 */
export function mapSorenessDomainToUi(domainScore: number): WellnessUiScore {
  const clamped = Math.max(0, Math.min(10, domainScore));
  const ui = Math.round((clamped * 4) / 10 + 1);
  return Math.max(1, Math.min(5, ui)) as WellnessUiScore;
}
