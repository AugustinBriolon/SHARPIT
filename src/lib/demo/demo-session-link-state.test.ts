import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  filterDemoLinkedSessionSuggestions,
  markDemoSessionLinked,
  readDemoLinkedPlannedSessionIds,
} from '@/lib/demo/demo-session-link-state';

describe('demo-session-link-state', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      sessionStorage: {
        store: {} as Record<string, string>,
        getItem(key: string) {
          return this.store[key] ?? null;
        },
        setItem(key: string, value: string) {
          this.store[key] = value;
        },
        removeItem(key: string) {
          delete this.store[key];
        },
      },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('tracks demo-linked planned sessions in sessionStorage', () => {
    markDemoSessionLinked('ps-1', 'act-1');
    expect(readDemoLinkedPlannedSessionIds()).toEqual(new Set(['ps-1']));
  });

  it('filters suggestions already linked in demo', () => {
    markDemoSessionLinked('ps-1', 'act-1');
    const filtered = filterDemoLinkedSessionSuggestions(
      [
        { id: 'ps-1:act-1', plannedSessionId: 'ps-1' },
        { id: 'ps-2:act-2', plannedSessionId: 'ps-2' },
      ],
      readDemoLinkedPlannedSessionIds(),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.plannedSessionId).toBe('ps-2');
  });
});
