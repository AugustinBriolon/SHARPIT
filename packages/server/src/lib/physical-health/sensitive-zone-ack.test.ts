import { describe, expect, it } from 'vitest';
import {
  isSessionAcked,
  parseSensitiveZoneAckSnapshot,
  pruneAcks,
  type SensitiveZoneAcks,
} from './sensitive-zone-ack';

const NOW = new Date('2026-09-13T09:00:00.000Z');

function acks(entries: Record<string, string>): SensitiveZoneAcks {
  return { version: 1, acks: entries };
}

describe('isSessionAcked', () => {
  it('recognises a session the athlete accepted', () => {
    expect(isSessionAcked(acks({ s1: NOW.toISOString() }), 's1')).toBe(true);
  });

  it('silences that session only', () => {
    expect(isSessionAcked(acks({ s1: NOW.toISOString() }), 's2')).toBe(false);
  });

  it('says no without a store or without an id', () => {
    expect(isSessionAcked(null, 's1')).toBe(false);
    expect(isSessionAcked(acks({ s1: NOW.toISOString() }), '')).toBe(false);
  });
});

describe('pruneAcks', () => {
  it('keeps a recent acknowledgement', () => {
    const recent = new Date(NOW.getTime() - 10 * 86_400_000).toISOString();

    expect(pruneAcks(acks({ s1: recent }), NOW).acks).toEqual({ s1: recent });
  });

  it('drops one old enough that its session is history', () => {
    const old = new Date(NOW.getTime() - 200 * 86_400_000).toISOString();

    expect(pruneAcks(acks({ s1: old }), NOW).acks).toEqual({});
  });

  it('drops an unparseable timestamp rather than keeping it forever', () => {
    expect(pruneAcks(acks({ s1: 'pas une date' }), NOW).acks).toEqual({});
  });
});

describe('parseSensitiveZoneAckSnapshot', () => {
  it('round-trips a stored store', () => {
    const stored = acks({ s1: NOW.toISOString() });

    expect(parseSensitiveZoneAckSnapshot(JSON.stringify(stored))).toEqual(stored);
  });

  it('refuses anything that is not the shape it wrote', () => {
    expect(parseSensitiveZoneAckSnapshot('')).toBeNull();
    expect(parseSensitiveZoneAckSnapshot('pas du json')).toBeNull();
    expect(parseSensitiveZoneAckSnapshot(JSON.stringify({ version: 2, acks: {} }))).toBeNull();
    expect(
      parseSensitiveZoneAckSnapshot(JSON.stringify({ version: 1, acks: { s1: 3 } })),
    ).toBeNull();
  });
});
