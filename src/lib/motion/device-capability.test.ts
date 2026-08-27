import { describe, expect, it } from 'vitest';
import { isLowEndDevice } from '@/lib/motion/device-capability';

describe('isLowEndDevice', () => {
  it('treats clearly constrained memory as low-end', () => {
    expect(isLowEndDevice({ deviceMemory: 1, hardwareConcurrency: 8 })).toBe(true);
    expect(isLowEndDevice({ deviceMemory: 2, hardwareConcurrency: 8 })).toBe(true);
  });

  it('does not flag a typical phone that omits deviceMemory', () => {
    // Safari never exposes deviceMemory; many phones report 4–6 cores.
    // The old ≤4 gate skipped the route reveal on every iPhone.
    expect(isLowEndDevice({ deviceMemory: undefined, hardwareConcurrency: 4 })).toBe(false);
    expect(isLowEndDevice({ deviceMemory: undefined, hardwareConcurrency: 6 })).toBe(false);
  });

  it('still flags truly minimal CPUs when memory is unknown', () => {
    expect(isLowEndDevice({ deviceMemory: undefined, hardwareConcurrency: 1 })).toBe(true);
    expect(isLowEndDevice({ deviceMemory: undefined, hardwareConcurrency: 2 })).toBe(true);
  });

  it('keeps a mid-range Android with reported memory off the low-end list', () => {
    expect(isLowEndDevice({ deviceMemory: 4, hardwareConcurrency: 8 })).toBe(false);
    expect(isLowEndDevice({ deviceMemory: 8, hardwareConcurrency: 4 })).toBe(false);
  });
});
