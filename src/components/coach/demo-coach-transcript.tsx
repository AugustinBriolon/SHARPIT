'use client';

import { CoachMessage } from '@/components/coach/chat/coach-message';
import { coachBeuiTheme } from '@/components/coach/beui/coach-beui-theme';
import { LinkButton } from '@/components/ui/link-button';

export type DemoTranscriptMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

/**
 * Read-only rendering of the seeded demo conversation (see
 * seedDemoCoachConversation) — same bubble language as the live chat
 * (coachBeuiTheme), no composer, no live chat hooks. A demo visitor gets to
 * see the coach reason from real seeded data instead of a blank dead-end.
 */
export function DemoCoachTranscript({
  title,
  messages,
}: {
  title: string;
  messages: DemoTranscriptMessage[];
}) {
  return (
    <div className="analysis-panel rounded-analysis-lg flex flex-col overflow-hidden">
      <div className="border-analysis-border border-b px-4 py-3">
        <p className="text-label">Exemple de conversation</p>
        <p className="mt-0.5 text-sm font-medium">{title}</p>
      </div>

      <div className="space-y-4 p-4">
        {messages.map((message) =>
          message.role === 'user' ? (
            <div key={message.id} className="flex justify-end">
              <p className={coachBeuiTheme.userBubble}>{message.text}</p>
            </div>
          ) : (
            <div key={message.id} className={coachBeuiTheme.assistantBubble}>
              <CoachMessage>{message.text}</CoachMessage>
            </div>
          ),
        )}
      </div>

      <div className="border-analysis-border flex flex-col items-stretch gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Crée un compte pour poser tes propres questions au coach.
        </p>
        <LinkButton className="shrink-0" href="/sign-up" size="sm">
          Créer un compte
        </LinkButton>
      </div>
    </div>
  );
}
