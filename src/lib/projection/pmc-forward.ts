/**
 * PMC projection into the future.
 *
 * Shares the recurrence and the time constants with the historical series
 * (`@/lib/training/pmc`), so a projection cannot drift from the history it
 * continues.
 *
 * @see docs/product/PROJECTED_ATHLETE_STATE.md
 * @see docs/adr/ADR-011-pmc-state-and-window-semantics.md
 */

import { PMC_ATL_TAU, PMC_CTL_TAU, pmcTsb, stepPmc, type PmcState } from '@/lib/training/pmc';

export { PMC_ATL_TAU, PMC_CTL_TAU };

/** One decimal, applied at the boundary only. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function projectPmcForward(
  initialCtl: number,
  initialAtl: number,
  dailyTss: readonly number[],
): Array<{ ctl: number; atl: number; tsb: number; tss: number }> {
  // State is carried at full precision and only the emitted values are rounded:
  // feeding rounded values back into the recurrence compounds the error daily.
  let state: PmcState = { ctl: initialCtl, atl: initialAtl };

  return dailyTss.map((tss) => {
    state = stepPmc(state, tss);
    return {
      ctl: round1(state.ctl),
      atl: round1(state.atl),
      tsb: round1(pmcTsb(state)),
      tss,
    };
  });
}
