'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MessageCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';
import { FadeIn } from '@/components/motion/fade-presence';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGoalMutations } from '@/hooks/use-data';
import { coachDiscussHref } from '@sharpit/app/lib/coach/chat/discuss/coach-discuss-href';
import type { GoalCapHeroView } from '@sharpit/app/lib/goals/goal-cap';
import { goalDomId } from '@sharpit/app/lib/today/rich/today-goal-anchor';

const GoalDialog = dynamic(
  () => import('@/components/goals/dialogs/goal-dialog').then((mod) => mod.GoalDialog),
  { ssr: false },
);

const ICON_BTN =
  'text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-lg focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden active:scale-[0.97]';

function CapMenu({
  goalId,
  onEdit,
  onDelete,
  deletePending,
}: {
  goalId: string;
  onEdit: () => void;
  onDelete: () => void;
  deletePending: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <Link
        aria-label="Discuter avec le coach"
        className={ICON_BTN}
        href={coachDiscussHref({ kind: 'goal', goalId })}
      >
        <MessageCircle className="size-4" aria-hidden />
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="Actions du cap" className={ICON_BTN}>
          <MoreHorizontal className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={onEdit}>
            <Pencil className="size-3.5" aria-hidden />
            Modifier
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            disabled={deletePending}
            variant="destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function CapProgress({ progress }: { progress: number }) {
  return (
    <div className="mt-4">
      <div
        aria-label={`Progression ${progress} %`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress}
        className="bg-foreground/10 h-1 overflow-hidden rounded-full"
        role="progressbar"
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-muted-foreground mt-1.5 text-xs tabular-nums">{progress} % de la cible</p>
    </div>
  );
}

function CapIdentity({ hero }: { hero: GoalCapHeroView }) {
  const meta = [hero.detail, hero.phaseLabel].filter(Boolean).join(' · ');
  return (
    <div className="min-w-0">
      <p className="text-label text-muted-foreground">{hero.eyebrow}</p>
      <h2 className="text-card-title text-foreground mt-1.5 text-pretty" id="goal-cap-title">
        {hero.title}
      </h2>
      {hero.countdown ? (
        <p className="text-data text-foreground mt-3 text-2xl leading-none font-semibold tracking-tight tabular-nums">
          {hero.countdown}
          {hero.countdownCaption ? (
            <span className="text-muted-foreground ms-2 text-sm font-normal tracking-normal">
              {hero.countdownCaption}
            </span>
          ) : null}
        </p>
      ) : null}
      {meta ? <p className="text-muted-foreground mt-2 text-sm">{meta}</p> : null}
      {hero.progress !== null ? <CapProgress progress={hero.progress} /> : null}
    </div>
  );
}

/** Cap identity — analysis panel, same chrome language as the rest of the app. */
export function GoalCapHero({ hero, editGoal }: { hero: GoalCapHeroView; editGoal: GoalForEdit }) {
  const { remove } = useGoalMutations();
  const [editing, setEditing] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  async function handleDelete() {
    const confirmed = await confirm({
      title: `Supprimer « ${hero.title} » ?`,
      description: 'Cette action est définitive.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (!confirmed) {
      return;
    }
    remove.mutate(hero.goalId);
  }

  return (
    <FadeIn>
      <section
        aria-labelledby="goal-cap-title"
        className="analysis-panel rounded-analysis-lg px-4 py-4"
        id={goalDomId(hero.goalId)}
      >
        <div className="flex items-start justify-between gap-3">
          <CapIdentity hero={hero} />
          <CapMenu
            deletePending={remove.isPending}
            goalId={hero.goalId}
            onDelete={handleDelete}
            onEdit={() => setEditing(true)}
          />
        </div>
      </section>
      {editing ? <GoalDialog goal={editGoal} onClose={() => setEditing(false)} /> : null}
      {dialog}
    </FadeIn>
  );
}

export function GoalCapHeroSkeleton() {
  return <div className="analysis-panel rounded-analysis-lg h-28 animate-pulse" aria-busy />;
}
