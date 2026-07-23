import { describe, expect, it } from 'vitest';
import {
  computeFosterSessionLoad,
  FOSTER_TSS_DISSONANCE_RATIO,
  formatFosterLoadHint,
  fosterDissonanceLabel,
  fosterSessionLoadToTss,
  fosterTssDissonanceRatio,
} from './foster-session-load';

describe('foster-session-load', () => {
  it('computes RPE × minutes', () => {
    expect(computeFosterSessionLoad(3600, 7)).toBeCloseTo(420, 5);
    expect(computeFosterSessionLoad(1800, 8)).toBeCloseTo(240, 5);
  });

  it('maps 1h at RPE 10 to 100 TSS-equivalent', () => {
    expect(fosterSessionLoadToTss(600)).toBeCloseTo(100, 5);
    expect(fosterSessionLoadToTss(300)).toBeCloseTo(50, 5);
  });

  it('flags dissonance only above the ratio bar', () => {
    // Foster 420 → TSS_eq 70; canonical 72 → small gap
    expect(fosterTssDissonanceRatio(72, 420)).toBeLessThan(FOSTER_TSS_DISSONANCE_RATIO);
    expect(fosterDissonanceLabel(72, 420)).toBeNull();

    // Foster 420 → 70; canonical 40 → large gap, perceived higher
    expect(fosterDissonanceLabel(40, 420)).toBe('higher');
    // Foster 180 → 30; canonical 80 → perceived lower
    expect(fosterDissonanceLabel(80, 180)).toBe('lower');
  });

  it('formats a discreet activity-header hint', () => {
    expect(formatFosterLoadHint(null, 7, 70)).toBeNull();
    expect(formatFosterLoadHint(3600, 7, null)).toBe('420 perçue');
    expect(formatFosterLoadHint(3600, 7, 72)).toBe('420 perçue');
    expect(formatFosterLoadHint(3600, 7, 40)).toBe('420 perçue (ressenti plus élevé)');
    expect(formatFosterLoadHint(1800, 6, 80)).toBe('180 perçue (ressenti plus bas)');
  });
});
