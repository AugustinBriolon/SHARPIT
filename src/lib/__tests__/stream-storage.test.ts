import { describe, expect, it } from 'vitest';
import { compactRawStreamsForStorage } from '@/lib/streams';

describe('compactRawStreamsForStorage', () => {
  it('réduit une série haute fréquence à 1 Hz', () => {
    const raw = {
      time: [0, 0.5, 1, 1.5, 2],
      distance: [0, 5, 10, 15, 20],
      altitude: [100, 100, 101, 101, 102],
      heartrate: [120, 122, 124, 126, 128],
      watts: [0, 0, 200, 210, 220],
      cadence: [0, 80, 82, 84, 86],
      velocity: [0, 2.5, 2.6, 2.7, 2.8],
      latlng: [
        [48.0, 2.0],
        [48.01, 2.01],
      ] as [number, number][],
    };

    const compact = compactRawStreamsForStorage(raw);

    expect(compact.time).toEqual([0, 1, 2]);
    expect(compact.distance).toEqual([0, 10, 20]);
    expect(compact.heartrate).toEqual([120, 124, 128]);
  });

  it('tronque au-delà de 8 h et échantillonne latlng', () => {
    const n = 30_000;
    const raw = {
      time: Array.from({ length: n }, (_, i) => i),
      distance: Array.from({ length: n }, (_, i) => i),
      altitude: [],
      heartrate: [],
      watts: [],
      cadence: [],
      velocity: [],
      latlng: Array.from(
        { length: 5_000 },
        (_, i) => [48 + i * 0.0001, 2 + i * 0.0001] as [number, number],
      ),
    };

    const compact = compactRawStreamsForStorage(raw);

    expect(compact.time.length).toBe(28_801);
    expect(compact.latlng.length).toBeLessThanOrEqual(801);
  });
});
