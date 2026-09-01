import { describe, expect, it, vi } from 'vitest';
import { notifyIntegrationSyncStarted } from '@/components/settings/integrations/modal-sync-start';

describe('notifyIntegrationSyncStarted', () => {
  it('dismisses the integrations modal immediately when a sync starts', () => {
    const onSyncStart = vi.fn();
    notifyIntegrationSyncStarted({ onSyncStart });
    expect(onSyncStart).toHaveBeenCalledOnce();
  });

  it('is a no-op when no dismiss handler is provided', () => {
    expect(() => notifyIntegrationSyncStarted({})).not.toThrow();
  });
});
