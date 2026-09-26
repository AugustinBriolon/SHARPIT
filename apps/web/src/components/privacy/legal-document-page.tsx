import { LegalMarkdownBody } from '@/components/privacy/legal-markdown-body';
import { LegalPageShell } from '@/components/privacy/legal-page-shell';
import { loadLegalPageMarkdown } from '@/legal/load-legal-page';

export async function LegalDocumentPage({ page }: { page: 'privacy' | 'terms' }) {
  const doc = await loadLegalPageMarkdown(page);
  return (
    <LegalPageShell lastUpdatedLabel={doc.lastUpdatedLabel} title={doc.title} version={doc.version}>
      <LegalMarkdownBody markdown={doc.bodyMarkdown} />
    </LegalPageShell>
  );
}
