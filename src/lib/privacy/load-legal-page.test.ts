import { readFileSync } from 'node:fs';
import path from 'node:path';
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

describe('Privacy Santé FR drafts consumed by /privacy and /terms', () => {
  function loadDraft(name: string): string {
    return stripLegalMetaHeader(readFileSync(path.join(process.cwd(), 'docs/legal', name), 'utf8'));
  }

  it('privacy draft is classic signup / word-of-mouth beta, not invite-only product', () => {
    const body = loadDraft('PRIVACY_PAGE_FR_V0.md');
    expect(body).toContain('augustin.briolon@gmail.com');
    expect(body).toContain('Augustin Briolon');
    expect(body).toMatch(/création de compte/i);
    expect(body).toMatch(/n['’]est pas un service « sur invitation uniquement »/);
  });

  it('terms draft keeps classic Clerk signup wording', () => {
    const body = loadDraft('TERMS_PAGE_FR_V0.md');
    expect(body).toContain('augustin.briolon@gmail.com');
    expect(body).toMatch(/parcours\s+\*\*classique\*\*|création de compte/i);
    expect(body).toMatch(
      /n['’]est\s+\*\*pas\*\*\s+un service accessible « sur invitation uniquement »/,
    );
  });
});
