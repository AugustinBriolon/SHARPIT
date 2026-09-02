import { describe, expect, it } from 'vitest';
import { stripLegalMetaHeader } from '@/lib/privacy/load-legal-page';

describe('stripLegalMetaHeader', () => {
  it('keeps the published ## body and drops status meta', () => {
    const raw = `# Politique — brouillon

> **Statut :** brouillon FR
> **Langue :** français

---

## Politique de confidentialité de Sharpit

**Dernière mise à jour :** 2 septembre 2026

### 1. Qui est responsable ?

Augustin Briolon
`;
    const body = stripLegalMetaHeader(raw);
    expect(body.startsWith('## Politique de confidentialité de Sharpit')).toBe(true);
    expect(body).not.toContain('**Statut :**');
    expect(body).toContain('Augustin Briolon');
  });
});
