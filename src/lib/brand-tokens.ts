/**
 * SHARPIT brand primitives — Seed-inspired botanical-clinical palette.
 * Semantic signal colors (--signal-*) stay in globals.css; they are data, not brand.
 *
 * Mapping:
 * - forestDepths → --foreground (ink) + dark section surfaces
 * - interactivePrimary → --primary (links, icons, CTAs, selected)
 * - limePulse → --highlight (badges, nav active, icon wells)
 *
 * Cohesion rule: surfaces and signal hues lean into the Lime Pulse family
 * (hue ~120–142) so the site continues the highlight — never mute the lime.
 */
export const BRAND = {
  /** Body ink / dark section canvas — not the interactive accent */
  forestDepths: '#1c3a13',
  /**
   * Interactive primary on light (approx oklch 0.48 0.13 142).
   * Distinct from Forest so text-primary / bg-primary/10 stay chromatic.
   */
  interactivePrimary: '#2f6b28',
  /** Seed Lime Pulse — highlight punctuation (nav active, badges); keep vivid */
  limePulse: '#d3fa99',
  /** Muted green accent (variant / supporting) — leaf-adjacent */
  sageMoss: '#6f7a52',
  /** Soft yellow-green wash — tempo / moderate family toward lime */
  oliveGold: '#a8b05c',
  /** Cooler evening green — still in botanical lime orbit */
  eucalyptus: '#5f8a6e',
  /** Page canvas — warm off-white, never pure #fff */
  snowWhite: '#fcfcf7',
  /** Secondary surface / muted panels — slight lime cast */
  warmStone: '#f0f1e8',
  /** Frosted / muted neutral */
  frostedGlass: '#c4c7c4',
  /** Disabled / low-emphasis borders */
  ash: '#b3b3b3',
  /** Secondary body text */
  pewter: '#666666',
  /** Card / control radius (Seed cards = 16px); buttons stay instrument-rounded */
  radius: '1rem',
} as const;

export type BrandToken = keyof typeof BRAND;
