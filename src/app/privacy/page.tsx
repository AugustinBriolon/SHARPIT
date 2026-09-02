import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/privacy/legal-document-page';

export const metadata: Metadata = {
  title: 'Confidentialité — SHARPIT',
  description: 'Politique de confidentialité SHARPIT (FR).',
};

export default function PrivacyPage() {
  return <LegalDocumentPage page="privacy" />;
}
