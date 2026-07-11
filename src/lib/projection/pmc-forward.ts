/**
 * PMC forward step — same EWMA as computePmcSeries (analytics.ts).
 * @see docs/product/PROJECTED_ATHLETE_STATE.md
 */

export const PMC_CTL_TAU = 42;
export const PMC_ATL_TAU = 7;

export function stepPmc(
  ctl: number,
  atl: number,
  tss: number,
): { ctl: number; atl: number; tsb: number } {
  const nextCtl = ctl + (tss - ctl) / PMC_CTL_TAU;
  const nextAtl = atl + (tss - atl) / PMC_ATL_TAU;
  return {
    ctl: Math.round(nextCtl * 10) / 10,
    atl: Math.round(nextAtl * 10) / 10,
    tsb: Math.round((nextCtl - nextAtl) * 10) / 10,
  };
}

export function projectPmcForward(
  initialCtl: number,
  initialAtl: number,
  dailyTss: readonly number[],
): Array<{ ctl: number; atl: number; tsb: number; tss: number }> {
  let ctl = initialCtl;
  let atl = initialAtl;
  return dailyTss.map((tss) => {
    const next = stepPmc(ctl, atl, tss);
    ({ ctl, atl } = next);
    return { ...next, tss };
  });
}
