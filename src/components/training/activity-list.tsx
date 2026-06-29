"use client";

import { ActivityType } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { queryKeys } from "@/lib/client/keys";
import {
  activityTypeColors,
  activityTypeLabels,
  formatDate,
  formatDistance,
  formatDuration,
} from "@/lib/format";

type ActivityItem = {
  id: string;
  type: ActivityType;
  date: Date;
  title: string | null;
  duration: number | null;
  load: number | null;
  runMetrics: { distanceM: number | null } | null;
  bikeMetrics: { tss: number | null } | null;
  swimMetrics: { distanceM: number | null } | null;
  strengthSets: { exercise: string }[];
};

export function ActivityList({ activities }: { activities: ActivityItem[] }) {
  if (!activities.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 p-12 text-center">
        <p className="text-muted-foreground">Aucune séance enregistrée.</p>
        <LinkButton href="/training/new" className="mt-4">
          Ajouter une séance
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <ActivityRow key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

function ActivityRow({ activity }: { activity: ActivityItem }) {
  const summary = getActivitySummary(activity);

  return (
    <Link
      href={`/training/${activity.id}`}
      className="group flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-5 py-4 transition-colors hover:border-primary/30 hover:bg-card/70"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={activityTypeColors[activity.type]}>
            {activityTypeLabels[activity.type]}
          </Badge>
          <span className="font-medium">
            {activity.title ?? activityTypeLabels[activity.type]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDate(new Date(activity.date))} · {formatDuration(activity.duration)}
          {summary ? ` · ${summary}` : ""}
        </p>
      </div>
      <div className="text-right">
        {activity.load != null && (
          <p className="font-mono text-sm text-primary">
            {Math.round(activity.load)} TSS
          </p>
        )}
      </div>
    </Link>
  );
}

function getActivitySummary(activity: ActivityItem) {
  switch (activity.type) {
    case ActivityType.RUN:
      return formatDistance(activity.runMetrics?.distanceM);
    case ActivityType.BIKE:
      return activity.bikeMetrics?.tss
        ? `${Math.round(activity.bikeMetrics.tss)} TSS`
        : undefined;
    case ActivityType.SWIM:
      return formatDistance(activity.swimMetrics?.distanceM);
    case ActivityType.STRENGTH:
      return activity.strengthSets.map((s) => s.exercise).join(", ");
    default:
      return undefined;
  }
}

export function DeleteActivityButton({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleDelete() {
    if (!confirm("Supprimer cette séance ?")) return;
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    await queryClient.invalidateQueries({ queryKey: queryKeys.activities });
    router.push("/training");
    router.refresh();
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete}>
      Supprimer
    </Button>
  );
}
