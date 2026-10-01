import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { stripLegalMetaHeader } from './load-legal-page';

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
    return stripLegalMetaHeader(
      readFileSync(path.join(process.cwd(), 'content/legal', name), 'utf8'),
    );
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

describe('Privacy policy matches what the iPhone app collects', () => {
  const body = stripLegalMetaHeader(
    readFileSync(path.join(process.cwd(), 'content/legal', 'PRIVACY_PAGE_FR_V0.md'), 'utf8'),
  );

  it('names every data source the App Store privacy manifest declares', () => {
    for (const source of [
      'Apple Santé',
      'Position',
      'Micro',
      'Appareil photo',
      'Journal alimentaire',
      'Open Food Facts',
      'Abonnement',
      'Notifications',
    ]) {
      expect(body).toContain(source);
    }
  });

  it('says Apple Health data never goes to iCloud or advertising', () => {
    expect(body).toMatch(/Apple Santé[\s\S]*ni stockées dans iCloud/);
    expect(body).toMatch(/Pas de publicité/);
  });

  it('no longer lists Renpho, withdrawn before launch', () => {
    expect(body).not.toContain('Renpho');
  });
});
