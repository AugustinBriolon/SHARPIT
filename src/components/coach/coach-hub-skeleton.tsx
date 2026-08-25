import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, MessageSquarePlus, Trash2 } from 'lucide-react';
import {
  CoachComposerChrome,
  CoachContextTagSkeleton,
} from '@/components/coach/chat/coach-composer-chrome';
import { CoachChatPanelShell } from '@/components/coach/chat/coach-chat-panel-shell';
import { CoachContextChip } from '@/components/coach/chat/coach-context-chip';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import type { CoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';

/** @deprecated Prefer CoachChatPanelShell — kept as alias for existing imports. */
export const CoachChatEmptyChrome = CoachChatPanelShell;

export function CoachMobileSelectLoadingRow() {
  return (
    <div className="flex items-center gap-1.5 p-2" aria-busy>
      <div className="min-w-0 flex-1">
        <div className="border-input flex min-h-11 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border bg-transparent py-2 pr-2 pl-2.5 text-sm lg:min-h-9">
          <SkeletonDataValue heightClassName="h-3.5" widthClassName="w-36 max-w-[70%]" />
          <ChevronDownIcon
            className="text-muted-foreground size-4 shrink-0 opacity-50"
            aria-hidden
          />
        </div>
      </div>
      <Button
        aria-label="Supprimer la conversation"
        className="text-muted-foreground size-11 shrink-0 lg:size-9"
        size="icon"
        type="button"
        variant="ghost"
        disabled
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

/** Desktop sidebar — only title/date values skeleton. */
export function CoachConversationListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-1 p-2" aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="rounded-analysis border border-transparent px-3 py-2.5">
          <SkeletonDataValue heightClassName="h-4" widthClassName="w-[min(100%,9rem)]" />
          <div className="mt-1">
            <SkeletonDataValue heightClassName="h-2.5" widthClassName="w-16" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function composerContextSlot(options: {
  attachedContext?: CoachDiscussContext | null;
  contextPending?: boolean;
}): ReactNode {
  if (options.attachedContext) {
    return <CoachContextChip context={options.attachedContext} onDetach={() => undefined} />;
  }
  if (options.contextPending) {
    return <CoachContextTagSkeleton />;
  }
  return null;
}

/** Mobile Select chrome — label value only skeletons. */
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
    <div className="rounded-analysis-lg flex h-full min-w-0 flex-1 flex-col lg:border" aria-busy>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {header && (
          <div className="bg-background fixed top-0 right-0 left-0 z-10 px-3 py-2">{header}</div>
        )}
        <div className="space-y-4 p-4">
          <div className="flex justify-end">
            <Skeleton className="bg-accent h-10 w-[min(100%,14rem)] rounded-[18px_18px_4px_18px]" />
          </div>
          <div className="flex justify-start">
            <div className="bg-analysis-surface-alt w-full max-w-[90%] space-y-2 rounded-[18px_18px_18px_4px] px-4 py-3">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-4 w-[92%] rounded-full" />
              <Skeleton className="h-4 w-[78%] rounded-full" />
              <Skeleton className="h-4 w-[64%] rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <CoachComposerChrome
        contextSlot={composerContextSlot({ attachedContext, contextPending })}
        disabled
      />
    </div>
  );
}

export function CoachPageHeader({
  newDisabled = false,
  onNewConversation,
}: {
  newDisabled?: boolean;
  onNewConversation?: () => void;
}) {
  return (
    <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-label">Coach</p>
        <h1 className="text-page-title mt-1">Fil & conversations</h1>
        <p className="text-muted-foreground mt-1">
          Messages du jour et chat libre avec ton coach.{' '}
          <Link className="text-primary hover:underline" href="/settings/memory">
            Mémoire & contexte
          </Link>
        </p>
      </div>
      {onNewConversation ? (
        <Button disabled={newDisabled} variant="highlight" onClick={onNewConversation}>
          <MessageSquarePlus className="size-4" />
          Nouvelle conversation
        </Button>
      ) : null}
    </StickyHeader>
  );
}

/** Route / Suspense — real chrome only, no thread or list skeletons. */
export function CoachHubSkeleton() {
  return (
    <>
      <div
        className="bg-background safe-area-top fixed inset-x-0 top-0 z-30 flex flex-col lg:hidden"
        style={{ bottom: 'var(--bottom-nav-offset)' }}
      >
        <CoachChatEmptyChrome
          header={
            <div className="flex flex-col gap-2 py-2">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-page-title truncate">Fil & conversations</h1>
                <Button
                  aria-label="Nouvelle conversation"
                  className="size-11"
                  size="icon"
                  variant="highlight"
                  disabled
                >
                  <MessageSquarePlus className="size-4.5" aria-hidden />
                </Button>
              </div>
            </div>
          }
        />
      </div>

      <div className="hidden space-y-6 lg:block">
        <CoachPageHeader newDisabled />
        <div className="flex h-[calc(100dvh-190px)] flex-col gap-3 lg:flex-row lg:gap-4">
          <aside className="flex w-full shrink-0 flex-col gap-2 lg:h-full lg:w-[260px]">
            <Button className="hidden lg:inline-flex" type="button" variant="highlight" disabled>
              <MessageSquarePlus className="size-4" />
              Nouvelle conversation
            </Button>
          </aside>
          <CoachChatEmptyChrome />
        </div>
      </div>
    </>
  );
}
