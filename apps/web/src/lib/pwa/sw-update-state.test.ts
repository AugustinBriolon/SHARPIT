import { describe, expect, it } from 'vitest';
import { reduceServiceWorkerUpdateState } from './sw-update-state';

describe('reduceServiceWorkerUpdateState', () => {
  it('transitions NONE -> AVAILABLE when a waiting worker is detected', () => {
    expect(reduceServiceWorkerUpdateState('NONE', { type: 'WAITING_DETECTED' })).toBe('AVAILABLE');
  });

  it('is idempotent — a second WAITING_DETECTED does not regress an already-AVAILABLE state', () => {
    expect(reduceServiceWorkerUpdateState('AVAILABLE', { type: 'WAITING_DETECTED' })).toBe(
      'AVAILABLE',
    );
  });

  it('transitions AVAILABLE -> ACTIVATING only on an explicit UPDATE_REQUESTED', () => {
    expect(reduceServiceWorkerUpdateState('AVAILABLE', { type: 'UPDATE_REQUESTED' })).toBe(
      'ACTIVATING',
    );
  });

  it('never activates on its own — UPDATE_REQUESTED before a worker is waiting is a no-op', () => {
    expect(reduceServiceWorkerUpdateState('NONE', { type: 'UPDATE_REQUESTED' })).toBe('NONE');
  });

  it('does not re-enter ACTIVATING from ACTIVATING on a stray UPDATE_REQUESTED', () => {
    expect(reduceServiceWorkerUpdateState('ACTIVATING', { type: 'UPDATE_REQUESTED' })).toBe(
      'ACTIVATING',
    );
  });

  it('CONTROLLER_CHANGED does not itself alter state — the caller reloads instead', () => {
    expect(reduceServiceWorkerUpdateState('ACTIVATING', { type: 'CONTROLLER_CHANGED' })).toBe(
      'ACTIVATING',
    );
    expect(reduceServiceWorkerUpdateState('NONE', { type: 'CONTROLLER_CHANGED' })).toBe('NONE');
  });
});
