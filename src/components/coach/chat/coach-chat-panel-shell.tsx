'use client';

import type { ReactNode } from 'react';
import { CoachComposerChrome } from '@/components/coach/chat/coach-composer-chrome';
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
      <section
        className={cn(
          'h-full [scrollbar-gutter:stable] overflow-y-auto overscroll-contain',
          coachBeuiTheme.scrollerViewport,
        )}
        aria-hidden
      >
        <div className={coachBeuiTheme.scrollerContent}>
          {header ? (
            <div className="bg-background fixed top-0 right-0 left-0 z-10 px-3 py-2">{header}</div>
          ) : null}
        </div>
      </section>
      <CoachComposerChrome disabled={composerDisabled} />
    </div>
  );
}
