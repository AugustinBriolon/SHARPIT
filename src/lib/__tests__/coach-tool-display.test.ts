import { describe, expect, it } from 'vitest';
import {
  buildToolDisplayEntries,
  condensedFailureLabel,
  failureLabelForPart,
  humanizeToolErrorMessage,
} from '@/lib/coach-tool-display';
import type { ToolPartLite } from '@/lib/coach-tool-parts';

describe('coach-tool-display', () => {
  it('humanizes generic English errors', () => {
    expect(humanizeToolErrorMessage('An error occurred.')).toEqual({
      hint: "L'ajout n'a pas abouti",
      debug: 'An error occurred.',
    });
  });

  it('uses failure label with session title', () => {
    const part: ToolPartLite = {
      type: 'tool-createPlannedSession',
      state: 'output-error',
      input: { title: 'Mobilité Reset Bassin' },
      errorText: 'An error occurred.',
    };
    expect(failureLabelForPart(part)).toBe('Séance non ajoutée — Mobilité Reset Bassin');
  });

  it('groups successes before condensed failures', () => {
    const parts: ToolPartLite[] = [
      {
        type: 'tool-createPlannedSession',
        state: 'output-error',
        input: { title: 'A' },
        errorText: 'An error occurred.',
      },
      {
        type: 'tool-createPlannedSession',
        state: 'output-available',
        output: { ok: true, title: 'B' },
      },
      {
        type: 'tool-createPlannedSession',
        state: 'output-error',
        input: { title: 'C' },
        errorText: 'An error occurred.',
      },
      {
        type: 'tool-createPlannedSession',
        state: 'output-error',
        input: { title: 'D' },
        errorText: 'An error occurred.',
      },
    ];

    const entries = buildToolDisplayEntries(parts);
    expect(entries[0]).toMatchObject({ kind: 'single', part: { output: { title: 'B' } } });
    const [, condensed] = entries;
    expect(condensed?.kind).toBe('condensed-failures');
    if (condensed?.kind === 'condensed-failures') {
      expect(condensedFailureLabel(condensed)).toBe('3 séances non ajoutées');
    }
  });
});
