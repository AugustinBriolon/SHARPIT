import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import {
  buildApprovalPreview,
  resolveApproveLabel,
  resolveRejectLabel,
} from '@/components/coach/beui/coach-tool-approval-helpers';

describe('buildApprovalPreview', () => {
  it('builds intent and endurance deroule for createPlannedSession', () => {
    const preview = buildApprovalPreview(
      'tool-createPlannedSession',
      {
        date: '2026-09-12',
        type: ActivityType.RUN,
        title: 'Sortie longue CAP endurance',
        durationMin: 105,
        intensity: 'ENDURANCE',
        load: 75,
        endurancePrescription: {
          blocks: [
            { steps: [{ kind: 'warmup', minutes: 15, effort: 'ENDURANCE' }] },
            {
              times: 4,
              steps: [
                { kind: 'interval', meters: 1000, effort: 'TEMPO' },
                { kind: 'recovery', minutes: 2, effort: 'RECOVERY' },
              ],
            },
            { steps: [{ kind: 'cooldown', minutes: 10, effort: 'RECOVERY' }] },
          ],
        },
      },
      {},
    );

    expect(preview.headline).toBe('Sortie longue CAP endurance');
    expect(preview.date).toBe('2026-09-12');
    expect(preview.intentLine).toBe('Course · 105 min · Endurance · charge 75');
    expect(preview.derouleLines[0]).toContain('Échauffement');
    expect(preview.derouleLines.some((line) => line.startsWith('4×'))).toBe(true);
  });

  it('falls back to description lines when no structured prescription', () => {
    const preview = buildApprovalPreview(
      'tool-createPlannedSession',
      {
        title: 'Sortie',
        description: 'Échauffement 15 min\nCorps 60 min Z2\nRetour 10 min',
      },
      {},
    );

    expect(preview.derouleLines).toEqual([
      'Échauffement 15 min',
      'Corps 60 min Z2',
      'Retour 10 min',
    ]);
  });

  it('lists brick legs as deroule', () => {
    const preview = buildApprovalPreview(
      'tool-createBrickSession',
      {
        date: '2026-09-13',
        title: 'Brick vélo+CAP',
        legs: [
          { type: ActivityType.BIKE, title: 'Vélo tempo', durationMin: 45 },
          { type: ActivityType.RUN, title: 'CAP transition', durationMin: 20 },
        ],
      },
      {},
    );

    expect(preview.intentLine).toBe('2 jambes');
    expect(preview.derouleLines).toEqual(['Vélo tempo · 45 min', 'CAP transition · 20 min']);
  });
});

describe('resolveApproveLabel / resolveRejectLabel', () => {
  it('uses Valider / Refuser for create-update', () => {
    expect(resolveApproveLabel(false, false, coachBeuiCopy)).toBe('Valider');
    expect(resolveRejectLabel(false, coachBeuiCopy)).toBe('Refuser');
  });

  it('uses Confirmer / Garder for delete, then confirm wording', () => {
    expect(resolveApproveLabel(true, false, coachBeuiCopy)).toBe('Confirmer');
    expect(resolveApproveLabel(true, true, coachBeuiCopy)).toBe('Confirmer la suppression');
    expect(resolveRejectLabel(true, coachBeuiCopy)).toBe('Garder');
  });
});
