import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { guardedActionLabel, useOfflineGuard } from '@/hooks/use-offline-guard';

vi.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: vi.fn(),
}));

import { useOnlineStatus } from '@/hooks/use-online-status';

function renderGuardProbe() {
  function Probe() {
    const guard = useOfflineGuard();
    return createElement('div', { 'data-guard': JSON.stringify(guard) });
  }

  const html = renderToStaticMarkup(createElement(Probe));
  const match = html.match(/data-guard="([^"]*)"/);
  if (!match) {
    throw new Error(`Unexpected probe markup: ${html}`);
  }

  return JSON.parse(match[1].replace(/&quot;/g, '"')) as ReturnType<typeof useOfflineGuard>;
}

describe('useOfflineGuard', () => {
  beforeEach(() => {
    vi.mocked(useOnlineStatus).mockReset();
  });

  it('returns online shape when useOnlineStatus is true', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true);

    expect(renderGuardProbe()).toEqual({
      online: true,
      offline: false,
      guardDisabled: false,
      offlineLabel: 'Hors ligne',
    });
  });

  it('returns offline shape when useOnlineStatus is false', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);

    expect(renderGuardProbe()).toEqual({
      online: false,
      offline: true,
      guardDisabled: true,
      offlineLabel: 'Hors ligne',
    });
  });
});

describe('guardedActionLabel', () => {
  it('prefers pending, then offline, then idle', () => {
    expect(guardedActionLabel(true, 'Hors ligne', 'Enregistrer')).toBe('Hors ligne');
    expect(guardedActionLabel(false, 'Hors ligne', 'Enregistrer')).toBe('Enregistrer');
    expect(
      guardedActionLabel(true, 'Hors ligne', 'Enregistrer', {
        active: true,
        label: 'Enregistrement…',
      }),
    ).toBe('Enregistrement…');
  });
});
