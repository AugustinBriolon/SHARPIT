import { describe, expect, it } from 'vitest';
import {
  accountStatusLabel,
  equipmentStatusLabel,
  goalsStatusLabel,
  integrationsStatusLabel,
  memoryStatusLabel,
  themeStatusLabel,
} from '@/lib/settings/hub-status';

describe('settings hub status labels', () => {
  it('accounts for partial profile fill', () => {
    expect(
      accountStatusLabel({
        heightCm: null,
        birthDate: null,
        sleepTargetMinutes: null,
        sleepBedtimeTargetMin: null,
      }),
    ).toBe('À compléter');
    expect(
      accountStatusLabel({
        heightCm: 180,
        birthDate: '1990-01-01',
        sleepTargetMinutes: 480,
        sleepBedtimeTargetMin: null,
      }),
    ).toBe('3/4 renseignés');
    expect(
      accountStatusLabel({
        heightCm: 180,
        birthDate: '1990-01-01',
        sleepTargetMinutes: 480,
        sleepBedtimeTargetMin: 1380,
      }),
    ).toBe('Complet');
  });

  it('summarizes equipment and goals', () => {
    expect(equipmentStatusLabel({ configured: false, ownedCount: 0 })).toBe('Non renseigné');
    expect(equipmentStatusLabel({ configured: true, ownedCount: 0 })).toBe('Lieu défini');
    expect(equipmentStatusLabel({ configured: true, ownedCount: 4 })).toBe('4 pièces');
    expect(goalsStatusLabel({ total: 0, activeRaces: 0 })).toBe('Aucun objectif');
    expect(goalsStatusLabel({ total: 3, activeRaces: 2 })).toBe('2 courses');
    expect(goalsStatusLabel({ total: 2, activeRaces: 0 })).toBe('2 objectifs');
  });

  it('summarizes memory and integrations', () => {
    expect(memoryStatusLabel({ entryCount: 0, hasProfileContext: false, activeLabel: null })).toBe(
      'Vide',
    );
    expect(
      memoryStatusLabel({
        entryCount: 2,
        hasProfileContext: true,
        activeLabel: 'Annecy',
      }),
    ).toBe('Annecy · préférences OK');
    expect(memoryStatusLabel({ entryCount: 1, hasProfileContext: false, activeLabel: null })).toBe(
      '1 entrée',
    );
    expect(integrationsStatusLabel({ connectedCount: 0 })).toBe('Aucune connexion');
    expect(integrationsStatusLabel({ connectedCount: 3 })).toBe('3 connectées');
  });

  it('maps theme preference', () => {
    expect(themeStatusLabel('system')).toBe('Système');
    expect(themeStatusLabel('dark')).toBe('Sombre');
  });
});
