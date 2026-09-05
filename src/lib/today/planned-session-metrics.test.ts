import { describe, expect, it } from 'vitest';
import {
  buildBrickSessionMetrics,
  buildPlannedSessionEquipmentTags,
  buildPlannedSessionMetrics,
} from './planned-session-metrics';

describe('buildPlannedSessionMetrics', () => {
  it('builds intensity, duration, and load for a planned run', () => {
    expect(
      buildPlannedSessionMetrics({
        type: 'RUN',
        durationMin: 45,
        intensity: 'TEMPO',
        load: 55,
        goalTitle: 'Nice 70.3',
      }),
    ).toEqual([
      { label: 'Intensité', value: 'Tempo', unit: '' },
      { label: 'Durée', value: '45', unit: 'min' },
      { label: 'Charge', value: '55', unit: 'TSS' },
    ]);
  });

  it('falls back to goal when load is absent', () => {
    expect(
      buildPlannedSessionMetrics({
        type: 'BIKE',
        durationMin: 90,
        intensity: 'ENDURANCE',
        load: null,
        goalTitle: 'Nice 70.3',
      }),
    ).toEqual([
      { label: 'Intensité', value: 'Endurance', unit: '' },
      { label: 'Durée', value: '1:30', unit: 'h' },
      { label: 'Objectif', value: 'Nice 70.3', unit: '' },
    ]);
  });

  it('puts exercise count and equipment ahead of intensity on a planned strength session', () => {
    expect(
      buildPlannedSessionMetrics({
        type: 'STRENGTH',
        durationMin: 50,
        intensity: 'ENDURANCE',
        load: null,
        title: 'Force Salle',
        description: 'Bas du corps + gainage',
        accessories: ['strength_dumbbells', 'strength_bench'],
        strengthPrescription: {
          version: 1,
          sets: [
            { exercise: 'Squat', sets: 3, reps: 8, order: 0 },
            { exercise: 'Soulevé de terre roumain', sets: 3, reps: 8, order: 1 },
            { exercise: 'Planche', sets: 3, reps: 0, durationSec: 40, order: 2 },
          ],
        },
      }),
    ).toEqual([
      { label: 'Durée', value: '50', unit: 'min' },
      { label: 'Exercices', value: '3', unit: 'exos' },
    ]);
  });

  it('lists two or three equipment tags at the same size', () => {
    expect(
      buildPlannedSessionEquipmentTags({
        type: 'STRENGTH',
        title: 'Force Salle',
        accessories: ['strength_dumbbells', 'strength_bench'],
      }),
    ).toEqual(['Haltères', 'Banc']);
    expect(
      buildPlannedSessionEquipmentTags({
        type: 'STRENGTH',
        accessories: [
          'strength_dumbbells',
          'strength_bench',
          'strength_bands',
          'strength_pullup_bar',
        ],
      }),
    ).toEqual(['Haltères', 'Banc', '+2']);
  });

  it('collapses overlapping band labels into one tag', () => {
    expect(
      buildPlannedSessionEquipmentTags({
        type: 'STRENGTH',
        title: 'Force Salle',
        description: 'Bas du corps + élastiques',
      }),
    ).toEqual(['Élastiques']);
  });

  it('counts unique exercises and falls back to intensity when no equipment is listed', () => {
    expect(
      buildPlannedSessionMetrics({
        type: 'STRENGTH',
        durationMin: 40,
        intensity: 'ENDURANCE',
        load: null,
        title: 'Force Salle',
        strengthPrescription: {
          version: 1,
          sets: [
            { exercise: 'Squat', sets: 3, reps: 8, order: 0 },
            { exercise: 'Squat', sets: 3, reps: 5, order: 1 },
          ],
        },
      }),
    ).toEqual([
      { label: 'Durée', value: '40', unit: 'min' },
      { label: 'Exercices', value: '1', unit: 'exo' },
    ]);
  });
});

describe('buildBrickSessionMetrics', () => {
  it('aggregates duration, leg count, and load', () => {
    expect(
      buildBrickSessionMetrics({
        legs: [
          { durationMin: 60, load: 40 },
          { durationMin: 30, load: 25 },
        ],
        goalTitle: 'Nice 70.3',
      }),
    ).toEqual([
      { label: 'Durée', value: '1:30', unit: 'h' },
      { label: 'Jambes', value: '2', unit: 'sports' },
      { label: 'Charge', value: '65', unit: 'TSS' },
    ]);
  });

  it('uses goal when brick has no load', () => {
    expect(
      buildBrickSessionMetrics({
        legs: [{ durationMin: 40, load: null }, { durationMin: 20 }],
        goalTitle: 'A1',
      }),
    ).toEqual([
      { label: 'Durée', value: '1:00', unit: 'h' },
      { label: 'Jambes', value: '2', unit: 'sports' },
      { label: 'Objectif', value: 'A1', unit: '' },
    ]);
  });
});
