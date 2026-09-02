'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ActivityType } from '@prisma/client';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { useActivityMutations } from '@/hooks/use-data';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import { useDemoActivityPlannedSession } from '@/hooks/use-demo-session-link-overlay';
import type { ActivityDetailHeaderActivity } from '@/components/training/activity/detail/activity-detail-header-content';
import { navStack } from '@/lib/navigation/nav-stack';

export function useActivityDetailHeaderActions(activity: ActivityDetailHeaderActivity) {
  const router = useRouter();
  const plannedSession = useDemoActivityPlannedSession(activity.id, activity.plannedSession);
  const { remove } = useActivityMutations();
  const { confirm, dialog } = useConfirmDialog();
  const [linkHikesOpen, setLinkHikesOpen] = useState(false);

  useResetWhenHidden(() => setLinkHikesOpen(false));

  const editHref = `/training/${activity.id}/edit`;
  const isHike = activity.type === ActivityType.HIKE;
  const hikeTrip = isHike ? activity.hikeTrip : null;

  async function handleDelete() {
    const confirmed = await confirm({
      title: 'Supprimer cette séance ?',
      description: 'Cette action est définitive.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (!confirmed) {
      return;
    }
    const currentHref = `/training/${activity.id}`;
    remove.mutate(activity.id);
    // Return to origin (Activité or Plan via stack); never freeze to Historique / Fil.
    const previous = navStack.peekBackFrom(currentHref);
    router.push(previous?.href ?? '/activite');
  }

  return {
    plannedSession,
    dialog,
    linkHikesOpen,
    setLinkHikesOpen,
    editHref,
    isHike,
    hikeTrip,
    handleDelete: () => void handleDelete(),
    openLinkHikes: () => setLinkHikesOpen(true),
  };
}
