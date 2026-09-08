import { Bug, MessageSquarePlus } from 'lucide-react';
import { MobileBackLink } from '@/components/layout/header/mobile-back-link';
import { StickyHeader } from '@/components/layout/header/sticky-header';
import { ShellHubGroup, ShellHubRow } from '@/components/shell/shell-hub-link';
import { MOI_HUB_PATH } from '@/lib/moi/paths';

const FEEDBACK_MAIL = 'augustin.briolon@gmail.com';

function mailto(subject: string, body: string) {
  return `mailto:${FEEDBACK_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function SettingsFeedbackPage() {
  return (
    <div className="space-y-5">
      <MobileBackLink fallbackHref={MOI_HUB_PATH} fallbackLabel="Paramètres" showOnDesktop />
      <StickyHeader>
        <h1 className="text-page-title">Feedback</h1>
      </StickyHeader>

      <div className="space-y-5">
        <div id="demande">
          <ShellHubGroup id="demande-group" title="Demande">
            <ShellHubRow
              icon={MessageSquarePlus}
              title="Demander une fonctionnalité"
              href={mailto(
                'SHARPIT — demande',
                'Décris ce que tu voudrais voir dans SHARPIT :\n\n',
              )}
            />
          </ShellHubGroup>
        </div>
        <div id="bug">
          <ShellHubGroup id="bug-group" title="Bug">
            <ShellHubRow
              icon={Bug}
              title="Signaler un bug"
              href={mailto(
                'SHARPIT — bug',
                'Décris ce qui s’est passé, sur quelle page, et ce que tu attendais :\n\n',
              )}
            />
          </ShellHubGroup>
        </div>
      </div>
    </div>
  );
}
