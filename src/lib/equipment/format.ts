import {
  EQUIPMENT_CATALOG,
  EQUIPMENT_SPORT_LABELS,
  EQUIPMENT_SPORTS,
  STRENGTH_VENUE_OPTIONS,
  type EquipmentSport,
} from '@/lib/equipment/catalog';
import { hasConfiguredEquipment } from '@/lib/equipment/parse';
import type { AthleteEquipment } from '@/lib/equipment/types';

function venueLabel(venue: AthleteEquipment['strengthVenue']): string | null {
  if (venue == null) return null;
  return STRENGTH_VENUE_OPTIONS.find((option) => option.id === venue)?.title ?? venue;
}

function linesForSport(equipment: AthleteEquipment, sport: EquipmentSport): string[] {
  const lines: string[] = [];

  if (sport === 'STRENGTH') {
    const venue = venueLabel(equipment.strengthVenue);
    if (venue) {
      lines.push(
        equipment.strengthVenue === 'gym' || equipment.strengthVenue === 'both'
          ? `Lieu : ${venue} (matériel salle disponible sans inventaire)`
          : `Lieu : ${venue}`,
      );
    }
  }

  const ownedLabels = EQUIPMENT_CATALOG.filter(
    (item) => item.sport === sport && equipment.owned.includes(item.id),
  ).map((item) => item.label);

  if (ownedLabels.length) {
    lines.push(`Matériel : ${ownedLabels.join(', ')}`);
  }

  return lines;
}

/** Compact markdown block for the coach system prompt. */
export function formatEquipmentForCoach(equipment: AthleteEquipment | null | undefined): string {
  const lines: string[] = ['## Équipement disponible'];

  if (!equipment || !hasConfiguredEquipment(equipment)) {
    lines.push(
      'Non renseigné. Reste sur le minimal universel (course outdoor, vélo outdoor si pertinent, poids du corps) et évite tout matériel spécifique.',
    );
    return lines.join('\n');
  }

  lines.push(
    'IMPÉRATIF : ne propose que des séances réalisables avec le matériel ci-dessous. Une inscription salle débloque le matériel de musculation standard (machines, racks, câbles) sans inventaire détaillé.',
  );

  for (const sport of EQUIPMENT_SPORTS) {
    const sportLines = linesForSport(equipment, sport);
    if (!sportLines.length) continue;
    lines.push(`- ${EQUIPMENT_SPORT_LABELS[sport]} : ${sportLines.join(' · ')}`);
  }

  return lines.join('\n');
}

/** One-line coach hint under a sport section in the UI. */
export function equipmentSportHint(
  equipment: AthleteEquipment,
  sport: EquipmentSport,
): string | null {
  if (sport === 'STRENGTH') {
    if (equipment.strengthVenue === 'gym' || equipment.strengthVenue === 'both') {
      return 'Avec une salle, SHARPIT peut proposer du renfo machines / racks / câbles.';
    }
    if (equipment.strengthVenue === 'home') {
      return equipment.owned.some((id) => id.startsWith('strength_'))
        ? 'Séances adaptées à ton matériel maison.'
        : 'Précise ton matériel maison pour débloquer des séances chargées.';
    }
    if (equipment.strengthVenue === 'bodyweight') {
      return 'Séances au poids du corps uniquement.';
    }
    return null;
  }

  const count = EQUIPMENT_CATALOG.filter(
    (item) => item.sport === sport && equipment.owned.includes(item.id),
  ).length;
  if (count === 0) return null;

  if (sport === 'BIKE' && equipment.owned.includes('bike_home_trainer')) {
    return 'Plan B indoor possible via home trainer.';
  }
  if (sport === 'SWIM' && equipment.owned.includes('swim_pool')) {
    return 'Natation structurée possible avec accès piscine.';
  }
  if (sport === 'RUN' && equipment.owned.includes('run_treadmill')) {
    return 'Course indoor possible sur tapis.';
  }
  return `${count} capacité${count > 1 ? 's' : ''} prise${count > 1 ? 's' : ''} en compte pour la génération.`;
}
