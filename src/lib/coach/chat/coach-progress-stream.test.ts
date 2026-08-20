import { describe, expect, it } from 'vitest';

import {
  encodeCoachProgressEvent,
  parseCoachProgressChunk,
  type CoachProgressEvent,
} from '@/lib/coach/chat/coach-progress-stream';

type Result = { summary: string };
type Partial = { sessions: { title: string }[] };

function encodeAll(events: CoachProgressEvent<Result, Partial>[]): string {
  return events.map(encodeCoachProgressEvent).join('');
}

describe('parseCoachProgressChunk', () => {
  it('round-trips a full sequence of events', () => {
    const sent: CoachProgressEvent<Result, Partial>[] = [
      { type: 'reasoning', delta: 'TSB à +14, ' },
      { type: 'partial', value: { sessions: [{ title: 'Sortie longue' }] } },
      { type: 'result', value: { summary: 'Semaine allégée' } },
    ];
    const { events, rest } = parseCoachProgressChunk<Result, Partial>(encodeAll(sent));
    expect(events).toEqual(sent);
    expect(rest).toBe('');
  });

  it('holds back a frame cut mid-JSON and completes it on the next chunk', () => {
    const whole = encodeAll([{ type: 'reasoning', delta: 'analyse de la charge' }]);
    const cut = Math.floor(whole.length / 2);

    const first = parseCoachProgressChunk<Result, Partial>(whole.slice(0, cut));
    expect(first.events).toEqual([]);

    const second = parseCoachProgressChunk<Result, Partial>(first.rest + whole.slice(cut));
    expect(second.events).toEqual([{ type: 'reasoning', delta: 'analyse de la charge' }]);
    expect(second.rest).toBe('');
  });

  it('drops a malformed frame without losing the valid ones around it', () => {
    const buffer =
      encodeCoachProgressEvent<Result, Partial>({ type: 'reasoning', delta: 'a' }) +
      'data: {not json\n\n' +
      encodeCoachProgressEvent<Result, Partial>({ type: 'reasoning', delta: 'b' });

    const { events } = parseCoachProgressChunk<Result, Partial>(buffer);
    expect(events).toEqual([
      { type: 'reasoning', delta: 'a' },
      { type: 'reasoning', delta: 'b' },
    ]);
  });

  it('ignores comment and keep-alive frames carrying no data line', () => {
    const buffer =
      ': keep-alive\n\n' +
      encodeCoachProgressEvent<Result, Partial>({ type: 'reasoning', delta: 'x' });
    const { events } = parseCoachProgressChunk<Result, Partial>(buffer);
    expect(events).toEqual([{ type: 'reasoning', delta: 'x' }]);
  });

  it('survives a delta containing the frame separator', () => {
    const delta = 'ligne 1\n\nligne 2';
    const { events } = parseCoachProgressChunk<Result, Partial>(
      encodeCoachProgressEvent<Result, Partial>({ type: 'reasoning', delta }),
    );
    expect(events).toEqual([{ type: 'reasoning', delta }]);
  });

  it('returns nothing for an empty buffer', () => {
    expect(parseCoachProgressChunk<Result, Partial>('')).toEqual({ events: [], rest: '' });
  });
});
