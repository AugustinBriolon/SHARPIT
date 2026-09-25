'use client';

import Link from 'next/link';
import { ExternalLink, MessageCircle, Pencil, RefreshCw, Unlink } from 'lucide-react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { COACH_DISCUSS_LABEL } from '@/components/coach/discuss/discuss-with-coach-button';
import { coachDiscussHref } from '@/lib/coach/chat/discuss/coach-discuss-href';

export function EditSessionMenuItem({ onEdit }: { onEdit: () => void }) {
  return (
    <DropdownMenuItem className="cursor-pointer gap-2" onClick={onEdit}>
      <Pencil className="size-3.5" aria-hidden />
      Modifier
    </DropdownMenuItem>
  );
}

export function ReanalyzeMenuItem({
  label,
  disabled,
  onReanalyze,
}: {
  label: string;
  disabled: boolean;
  onReanalyze: () => void;
}) {
  return (
    <DropdownMenuItem className="cursor-pointer gap-2" disabled={disabled} onClick={onReanalyze}>
      <RefreshCw className="size-3.5" aria-hidden />
      {label}
    </DropdownMenuItem>
  );
}

export function CoachDiscussMenuItem({
  sessionId,
  onNavigate,
}: {
  sessionId: string;
  onNavigate: () => void;
}) {
  return (
    <DropdownMenuItem
      className="cursor-pointer gap-2"
      nativeButton={false}
      render={
        <Link
          href={coachDiscussHref({ kind: 'planned-session', sessionId })}
          onClick={onNavigate}
        />
      }
    >
      <MessageCircle className="size-3.5" aria-hidden />
      {COACH_DISCUSS_LABEL}
    </DropdownMenuItem>
  );
}

export function LinkedActivityMenuItems({
  activityId,
  onNavigate,
  onDelink,
  delinkPending,
}: {
  activityId: string;
  onNavigate: () => void;
  onDelink?: () => void;
  delinkPending: boolean;
}) {
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="cursor-pointer gap-2"
        nativeButton={false}
        render={<Link href={`/activite/${activityId}`} onClick={onNavigate} />}
      >
        <ExternalLink className="size-3.5" aria-hidden />
        Voir l&apos;activité
      </DropdownMenuItem>
      {onDelink ? (
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          disabled={delinkPending}
          variant="destructive"
          onClick={onDelink}
        >
          <Unlink className="size-3.5" aria-hidden />
          Délier
        </DropdownMenuItem>
      ) : null}
    </>
  );
}
