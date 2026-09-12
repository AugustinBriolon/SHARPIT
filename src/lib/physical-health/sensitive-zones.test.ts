import { describe, expect, it } from 'vitest';
import {
  catalogGroupsForRegion,
  exerciseZoneConflict,
  formatSensitiveZoneRules,
  sensitiveZonesFrom,
  type SensitiveZone,
} from './sensitive-zones';

describe('catalogGroupsForRegion', () => {
  it('maps the regions the athlete actually writes', () => {
    expect(catalogGroupsForRegion('Ischio')).toEqual(['upper legs']);
    expect(catalogGroupsForRegion('Pied')).toEqual(['lower legs']);
    expect(catalogGroupsForRegion('Bassin')).toEqual(['waist']);
    expect(catalogGroupsForRegion('Épaule')).toEqual(['shoulders']);
  });

  it('covers both thigh and calf work for a knee', () => {
    expect(catalogGroupsForRegion('Genou')).toEqual(['upper legs', 'lower legs']);
  });

  it('never guesses an unknown region', () => {
    expect(catalogGroupsForRegion('Mâchoire')).toEqual([]);
    expect(catalogGroupsForRegion(null)).toEqual([]);
  });
});

describe('sensitiveZonesFrom', () => {
  it('keeps pains and injuries that still constrain training', () => {
    const zones = sensitiveZonesFrom([
      { type: 'PAIN', label: 'Nerf sciatique', bodyRegion: 'Ischio', side: 'LEFT', severity: 1 },
      { type: 'INJURY', label: 'Fracture', bodyRegion: 'Pied', side: 'NA', severity: 6 },
    ]);

    expect(zones).toHaveLength(2);
    expect(zones[0]).toMatchObject({ region: 'Ischio', side: 'LEFT', groups: ['upper legs'] });
    expect(zones[1]?.side).toBeNull();
  });

  it('leaves posture and mobility work out — they are not a load restriction', () => {
    expect(
      sensitiveZonesFrom([
        { type: 'POSTURE_ISSUE', label: 'Bassin rétroversé', bodyRegion: 'Bassin' },
        { category: 'MOBILITY', title: 'Chevilles raides', bodyPart: 'Cheville' },
      ]),
    ).toEqual([]);
  });

  it('drops resolved conditions and those declared not to affect training', () => {
    expect(
      sensitiveZonesFrom([
        { type: 'PAIN', label: 'Ancienne douleur', bodyRegion: 'Genou', status: 'RESOLVED' },
        { type: 'PAIN', label: 'Gêne', bodyRegion: 'Genou', affectsTraining: false },
      ]),
    ).toEqual([]);
  });

  it('accepts the legacy note shape too', () => {
    expect(
      sensitiveZonesFrom([{ category: 'PAIN', title: 'Tendon', bodyPart: 'Genou' }]),
    ).toHaveLength(1);
  });
});

describe('exerciseZoneConflict', () => {
  const zones: SensitiveZone[] = [
    {
      label: 'Nerf sciatique',
      region: 'Ischio',
      side: 'LEFT',
      severity: 1,
      groups: ['upper legs'],
    },
  ];

  it('flags an exercise loading the protected group', () => {
    expect(exerciseZoneConflict('upper legs', zones)?.label).toBe('Nerf sciatique');
  });

  it('lets everything else through', () => {
    expect(exerciseZoneConflict('shoulders', zones)).toBeNull();
    expect(exerciseZoneConflict(null, zones)).toBeNull();
    expect(exerciseZoneConflict('upper legs', [])).toBeNull();
  });
});

describe('formatSensitiveZoneRules', () => {
  it('says nothing when there is nothing to protect', () => {
    expect(formatSensitiveZoneRules([])).toBe('');
  });

  it('names the zone, the side and the severity', () => {
    const block = formatSensitiveZoneRules([
      {
        label: 'Nerf sciatique',
        region: 'Ischio',
        side: 'LEFT',
        severity: 1,
        groups: ['upper legs'],
      },
    ]);

    expect(block).toContain('Nerf sciatique — zone Ischio (left), sévérité 1/10');
    expect(block).toContain('Renforce AUTOUR');
  });
});
