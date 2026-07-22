import { describe, expect, it } from 'vitest';
import { parseCoachMessage, splitConversationTail } from '@/lib/coach/coach-message-structure';

const SAMPLE = `Voici ton plan nutrition pour la course :

**B. Vélo (90 km)**

**Hydratation**
- Apport : 500-750ml par heure
- Total : 3 bidons

**Glucides**
- Cible : 70g/heure
- 5 gels autour du km 70

**C. Course à pied (21.1 km)**

- Glucides : 60g/heure
- Caféine : 200mg au km 15

## Synthèse de tes besoins totaux

- Hydratation : ~4.5L
- Glucides : ~350g

**Conseil Elite pour tes douleurs**

Réduis l'intensité sur les 2 premiers km de course.

Veux-tu que je vérifie s'il y a des créneaux libres dans ton agenda ?`;

describe('coach-message-structure', () => {
  it('splits conversational question from structured plan', () => {
    const { body, conversation } = splitConversationTail(SAMPLE);
    expect(conversation).toContain('Veux-tu');
    expect(body).toContain('B. Vélo');
    expect(body).not.toContain('Veux-tu');
  });

  it('parses phases, synthesis and conversation blocks', () => {
    const blocks = parseCoachMessage(SAMPLE);
    expect(blocks.some((b) => b.type === 'phase' && b.title.includes('Vélo'))).toBe(true);
    expect(blocks.some((b) => b.type === 'phase' && b.title.includes('Course'))).toBe(true);
    expect(blocks.some((b) => b.type === 'synthesis' && b.title.includes('Synthèse'))).toBe(true);
    expect(blocks.some((b) => b.type === 'synthesis' && b.title.includes('Conseil Elite'))).toBe(
      true,
    );
    expect(blocks.at(-1)?.type).toBe('conversation');
  });

  it('extracts label/value metrics with numeric values', () => {
    const blocks = parseCoachMessage(SAMPLE);
    const velo = blocks.find((b) => b.type === 'phase' && b.title.includes('Vélo'));
    expect(velo?.type).toBe('phase');
    if (velo?.type !== 'phase') return;
    expect(velo.metrics.some((m) => m.label === 'Apport' && m.value.includes('500'))).toBe(true);
    expect(velo.metrics.some((m) => m.subsection === 'Hydratation')).toBe(true);
  });

  it('falls back to prose for short unstructured replies', () => {
    const blocks = parseCoachMessage('Bonne séance hier, continue comme ça.');
    expect(blocks).toEqual([{ type: 'prose', content: 'Bonne séance hier, continue comme ça.' }]);
  });

  it('does not duplicate intro prose before structured sections', () => {
    const intro = `C'est une excellente cible. Avec un TSB de +19, tu es en forme.

Voici ton plan nutritionnel stratégique pour la course :

**B. Vélo (90 km)**

- Apport : 500-750ml par heure`;

    const blocks = parseCoachMessage(intro);
    const prose = blocks.find((b) => b.type === 'prose');
    expect(prose?.type).toBe('prose');
    if (prose?.type !== 'prose') return;
    expect(prose.content.match(/C'est une excellente cible/g)?.length).toBe(1);
    expect(prose.content.match(/Voici ton plan nutritionnel/g)?.length).toBe(1);
  });

  it('keeps bold markdown bullets in phase prose instead of metric tiles', () => {
    const plan = `**B. Vélo (90 km)**

**Hydratation**
- **Bois 1,5L d'eau toutes les 20 min**
- **250-400ml d'eau** avant le départ

**Glucides**
- **Glucides simples** : 60g/heure`;

    const blocks = parseCoachMessage(plan);
    const velo = blocks.find((b) => b.type === 'phase' && b.title.includes('Vélo'));
    expect(velo?.type).toBe('phase');
    if (velo?.type !== 'phase') return;
    expect(velo.prose).toContain('**Bois 1,5L');
    expect(velo.prose).toContain('**250-400ml');
    expect(velo.prose).toContain('**Glucides simples**');
    expect(velo.metrics.every((m) => !m.value.includes('**') && !m.label.includes('**'))).toBe(
      true,
    );
  });
});
