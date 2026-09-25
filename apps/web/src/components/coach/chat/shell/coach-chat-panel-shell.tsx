'use client';

import type { ReactNode } from 'react';
import { CoachComposerChrome } from '@/components/coach/chat/shell/coach-composer-chrome';
import { coachBeuiTheme } from '@/components/coach/beui/coach-beui-theme';
import { cn } from '@/lib/utils';

/** Panel chrome only — no empty-state copy (avoids duplicating CoachChat landing UI). */
export function CoachChatPanelShell({
  composerDisabled = true,
  header,
}: {
  composerDisabled?: boolean;
  header?: ReactNode;
}) {
  return (
    <div className={coachBeuiTheme.panel}>
      <div className={cn(coachBeuiTheme.column, 'flex h-full min-h-0 flex-col')} aria-hidden>
        {header ? <div className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2">{header}</div> : null}
        <section
          className={cn(
            '[scrollbar-gutter:stable] overflow-y-auto overscroll-contain',
            coachBeuiTheme.scrollerViewport,
          )}
        >
          <div className={coachBeuiTheme.scrollerContent} />
        </section>
        <CoachComposerChrome disabled={composerDisabled} />
      </div>
    </div>
  );
}
