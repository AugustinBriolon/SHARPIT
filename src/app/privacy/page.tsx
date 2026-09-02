import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/privacy/legal-document-page';

export const metadata: Metadata = {
  title: 'Confidentialité — SHARPIT',
  description: 'Politique de confidentialité SHARPIT (FR).',
};

export default function PrivacyPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background text-muted-foreground flex min-h-dvh items-center justify-center text-sm">
          Chargement…
        </div>
      }
    >
      <LegalDocumentPage page="privacy" />
    </Suspense>
  );
}
