import { hasConfiguredEquipment, normalizeAthleteEquipment } from '@/lib/equipment/parse';

export type SettingsHubAccountFacts = {
  heightCm: number | null | undefined;
  birthDate: Date | string | null | undefined;
  sleepTargetMinutes: number | null | undefined;
  sleepBedtimeTargetMin: number | null | undefined;
};

export type SettingsHubGoalsFacts = {
  total: number;
  activeRaces: number;
};

export type SettingsHubMemoryFacts = {
  entryCount: number;
  hasProfileContext: boolean;
  activeLabel: string | null;
};

export type SettingsHubIntegrationsFacts = {
  connectedCount: number;
};

export type SettingsHubEquipmentFacts = {
  configured: boolean;
  ownedCount: number;
};

/** Stable French status chips for the settings hub — pure, testable. */
export function accountStatusLabel(facts: SettingsHubAccountFacts): string {
  const filled = [
    facts.heightCm != null,
    facts.birthDate != null && String(facts.birthDate).length > 0,
    facts.sleepTargetMinutes != null,
    facts.sleepBedtimeTargetMin != null,
  ].filter(Boolean).length;

  if (filled === 0) return 'À compléter';
  if (filled >= 4) return 'Complet';
  return `${filled}/4 renseignés`;
}

export function equipmentStatusLabel(facts: SettingsHubEquipmentFacts): string {
  if (!facts.configured) return 'Non renseigné';
  if (facts.ownedCount === 0) return 'Lieu défini';
  return facts.ownedCount === 1 ? '1 pièce' : `${facts.ownedCount} pièces`;
}

export function equipmentFactsFromRaw(raw: unknown): SettingsHubEquipmentFacts {
  const equipment = normalizeAthleteEquipment(raw);
  return {
    configured: hasConfiguredEquipment(equipment),
    ownedCount: equipment.owned.length,
  };
}

export function goalsStatusLabel(facts: SettingsHubGoalsFacts): string {
  if (facts.total === 0) return 'Aucun objectif';
  if (facts.activeRaces > 0) {
    return facts.activeRaces === 1 ? '1 course' : `${facts.activeRaces} courses`;
  }
  return facts.total === 1 ? '1 objectif' : `${facts.total} objectifs`;
}

export function memoryStatusLabel(facts: SettingsHubMemoryFacts): string {
  const parts: string[] = [];
  if (facts.activeLabel) {
    parts.push(facts.activeLabel);
  } else if (facts.entryCount > 0) {
    parts.push(facts.entryCount === 1 ? '1 entrée' : `${facts.entryCount} entrées`);
  }
  if (facts.hasProfileContext) {
    parts.push(parts.length === 0 ? 'Préférences OK' : 'préférences OK');
  }
  if (parts.length === 0) return 'Vide';
  return parts.join(' · ');
}

export function integrationsStatusLabel(facts: SettingsHubIntegrationsFacts): string {
  if (facts.connectedCount === 0) return 'Aucune connexion';
  return facts.connectedCount === 1 ? '1 connectée' : `${facts.connectedCount} connectées`;
}

export function tripsStatusLabel(count: number): string {
  if (count === 0) return 'Aucun déplacement';
  return count === 1 ? '1 dossier' : `${count} dossiers`;
}

export function themeStatusLabel(preference: 'light' | 'dark' | 'system'): string {
  switch (preference) {
    case 'light':
      return 'Clair';
    case 'dark':
      return 'Sombre';
    default:
      return 'Système';
  }
}

export type SettingsHubStatus = {
  account: string;
  equipment: string;
  goals: string;
  trips: string;
  memory: string;
  integrations: string;
  about: string;
};
