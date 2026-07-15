/**
 * Service-worker update lifecycle — pure state machine.
 *
 * Never activates a waiting worker on its own. `ACTIVATING` is only reached after
 * an explicit athlete confirmation (`UPDATE_REQUESTED`) — the current session, and
 * any open form or coaching dialog, is untouched until then.
 */

export type ServiceWorkerUpdateState = 'NONE' | 'AVAILABLE' | 'ACTIVATING';

export type ServiceWorkerUpdateEvent =
  | { readonly type: 'WAITING_DETECTED' }
  | { readonly type: 'UPDATE_REQUESTED' }
  | { readonly type: 'CONTROLLER_CHANGED' };

export function reduceServiceWorkerUpdateState(
  state: ServiceWorkerUpdateState,
  event: ServiceWorkerUpdateEvent,
): ServiceWorkerUpdateState {
  switch (event.type) {
    case 'WAITING_DETECTED':
      // Idempotent: a second waiting worker detected mid-activation doesn't regress state.
      return state === 'NONE' ? 'AVAILABLE' : state;
    case 'UPDATE_REQUESTED':
      // Only a confirmed AVAILABLE update can be requested — no-op otherwise
      // (guards against a stray message before a worker is actually waiting).
      return state === 'AVAILABLE' ? 'ACTIVATING' : state;
    case 'CONTROLLER_CHANGED':
      // The caller reloads the page once this fires; the in-memory state becomes moot.
      return state;
  }
}
