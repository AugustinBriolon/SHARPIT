/**
 * Soft intensity gate for Plan surfaces (Science Sport V1.1).
 *
 * When Today's verdict is RECOVER or CAUTION, Plan must not *propose* hard
 * intensities in "prochaines séances". Soft gate: filter / withhold hard
 * proposals when data exists; keep the module shape so Science Sport can
 * complete wiring without restructuring the hub.
 *
 * Hard intensities: TEMPO · THRESHOLD · VO2MAX · RACE.
 * Soft (allowed under recover/caution): RECOVERY · ENDURANCE · null/unknown.
 */

import type { OverallVerdict } from '@/lib/today/today-mapping';

export const HARD_SESSION_INTENSITIES = ['TEMPO', 'THRESHOLD', 'VO2MAX', 'RACE'] as const;

export type HardSessionIntensity = (typeof HARD_SESSION_INTENSITIES)[number];

/** Verdicts that soft-gate hard session proposals on Plan. */
export const INTENSITY_GATE_VERDICTS = ['RECOVER', 'CAUTION'] as const;

export type IntensityGateVerdict = (typeof INTENSITY_GATE_VERDICTS)[number];

export type IntensityGateableSession = {
  intensity?: string | null;
};

export type IntensityGateResult<T extends IntensityGateableSession> = {
  /** Sessions safe to propose under the current verdict. */
  proposed: T[];
  /** Hard sessions withheld when the gate is active. */
  withheld: T[];
  /** True when Today verdict triggers the soft gate. */
  gateActive: boolean;
  /** Verdict used for the decision (null = no gate — data incomplete). */
  verdict: OverallVerdict | null;
};

export function isHardSessionIntensity(
  intensity: string | null | undefined,
): intensity is HardSessionIntensity {
  if (!intensity) {
    return false;
  }
  return (HARD_SESSION_INTENSITIES as readonly string[]).includes(intensity);
}

export function shouldGateHardIntensities(verdict: OverallVerdict | null | undefined): boolean {
  if (!verdict) {
    return false;
  }
  return (INTENSITY_GATE_VERDICTS as readonly string[]).includes(verdict);
}

/**
 * Soft-gate upcoming sessions for Plan "prochaines".
 *
 * - No verdict / incomplete Today → propose all (gate inactive; Science can tighten).
 * - RECOVER / CAUTION → withhold hard intensities; keep soft ones.
 * - Other verdicts → propose all.
 */
export function gateUpcomingSessionsForVerdict<T extends IntensityGateableSession>(
  sessions: readonly T[],
  verdict: OverallVerdict | null | undefined,
): IntensityGateResult<T> {
  const resolved = verdict ?? null;
  const gateActive = shouldGateHardIntensities(resolved);

  if (!gateActive) {
    return {
      proposed: [...sessions],
      withheld: [],
      gateActive: false,
      verdict: resolved,
    };
  }

  const proposed: T[] = [];
  const withheld: T[] = [];
  for (const session of sessions) {
    if (isHardSessionIntensity(session.intensity)) {
      withheld.push(session);
    } else {
      proposed.push(session);
    }
  }

  return { proposed, withheld, gateActive: true, verdict: resolved };
}
