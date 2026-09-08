import type { ReactNode } from 'react';
import { History, MessageSquarePlus } from 'lucide-react';
import { coachBeuiTheme } from '@/components/coach/beui/coach-beui-theme';
import {
  CoachComposerChrome,
  CoachContextTagSkeleton,
} from '@/components/coach/chat/shell/coach-composer-chrome';
import { CoachChatPanelShell } from '@/components/coach/chat/shell/coach-chat-panel-shell';
import { Skeleton } from '@/components/ui/skeleton';
import type { CoachDiscussContext } from '@/lib/coach/chat/discuss/coach-discuss-context';
import { cn } from '@/lib/utils';

/** @deprecated Prefer CoachChatPanelShell — kept as alias for existing imports. */
export const CoachChatEmptyChrome = CoachChatPanelShell;

/** Immersive panel skeleton — header + empty transcript + composer. */
export function CoachChatPanelSkeleton({
  header,
  attachedContext = null,
  contextPending = false,
}: {
  header?: ReactNode;
  attachedContext?: CoachDiscussContext | null;
  contextPending?: boolean;
}) {
  return (
    <div className={coachBeuiTheme.panel} aria-busy>
      <div className={cn(coachBeuiTheme.column, 'flex h-full min-h-0 flex-col')}>
        {header ? <div className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2">{header}</div> : null}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
          <div className="flex justify-end">
            <Skeleton className="bg-accent h-10 w-[min(100%,14rem)] rounded-[18px_18px_4px_18px]" />
          </div>
          <div className="flex justify-start">
            <div className="w-full max-w-2xl space-y-2">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-4 w-[92%] rounded-full" />
              <Skeleton className="h-4 w-[78%] rounded-full" />
              <Skeleton className="h-4 w-[64%] rounded-full" />
            </div>
          </div>
        </div>
        {contextPending ? (
          <div className="shrink-0 px-3 sm:px-4">
            <CoachContextTagSkeleton />
          </div>
        ) : null}
        <CoachComposerChrome attachedContext={attachedContext} disabled />
      </div>
    </div>
  );
}

function ImmersiveHeaderSkeleton() {
  return (
    <div className="border-border/50 flex items-center gap-1 border-b px-2 py-1.5 sm:px-3">
      <Skeleton className="size-10 shrink-0 rounded-full lg:hidden" />
      <Skeleton className="h-4 w-40 max-w-[50%] rounded-full" />
      <div className="ml-auto flex gap-1">
        <span
          className="bg-muted text-muted-foreground inline-flex size-9 items-center justify-center rounded-full opacity-60"
          aria-hidden
        >
          <History className="size-4" />
        </span>
        <span
          className="bg-foreground/40 text-background inline-flex size-9 items-center justify-center rounded-full"
          aria-hidden
        >
          <MessageSquarePlus className="size-4" />
        </span>
      </div>
    </div>
  );
}

/** Route / Suspense — immersive chrome only. */
export function CoachHubSkeleton() {
  return (
    <div className="bg-background safe-area-top fixed inset-x-0 top-0 bottom-0 z-30 flex flex-col lg:bottom-(--bottom-nav-offset)">
      <CoachChatEmptyChrome header={<ImmersiveHeaderSkeleton />} />
    </div>
  );
}

/** @deprecated Hub title removed in immersive Coach — no-op for leftover imports. */
export function CoachPageHeader(_props?: {
  newDisabled?: boolean;
  onNewConversation?: () => void;
}) {
  return null;
}

/** @deprecated Mobile select chrome removed — kept for import stability. */
export function CoachMobileSelectLoadingRow() {
  return null;
}

/** @deprecated Sidebar list skeleton removed — kept for import stability. */
export function CoachConversationListSkeleton(_props?: { rows?: number }) {
  return null;
}
