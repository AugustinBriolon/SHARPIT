import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/privacy/legal-document-page';

export const metadata: Metadata = {
  title: "Conditions d'utilisation — SHARPIT",
  description: "Conditions d'utilisation SHARPIT (FR).",
};

export default function TermsPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background text-muted-foreground flex min-h-dvh items-center justify-center text-sm">
          Chargement…
        </div>
      }
    >
      <LegalDocumentPage page="terms" />
    </Suspense>
  );
}
