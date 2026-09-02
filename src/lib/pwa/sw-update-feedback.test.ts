import { describe, expect, it } from 'vitest';
import {
  SW_UPDATE_APPLYING_DESCRIPTION,
  SW_UPDATE_APPLYING_TITLE,
  buildApplyingUpdateToastOptions,
} from './sw-update-feedback';

describe('buildApplyingUpdateToastOptions', () => {
  it('returns a persistent loading toast so the athlete sees feedback before reload', () => {
    expect(buildApplyingUpdateToastOptions()).toEqual({
      type: 'loading',
      title: SW_UPDATE_APPLYING_TITLE,
      description: SW_UPDATE_APPLYING_DESCRIPTION,
      timeout: 0,
    });
  });

  it('uses French copy matching the shipped athlete UI', () => {
    const options = buildApplyingUpdateToastOptions();
    expect(options.title).toBe('Mise à jour en cours…');
    expect(options.description).toBe('Rechargement dans un instant');
  });
});
