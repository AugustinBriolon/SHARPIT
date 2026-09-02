import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/privacy/legal-document-page';

export const metadata: Metadata = {
  title: "Conditions d'utilisation — SHARPIT",
  description: "Conditions d'utilisation SHARPIT (FR).",
};

export default function TermsPage() {
  return <LegalDocumentPage page="terms" />;
}
