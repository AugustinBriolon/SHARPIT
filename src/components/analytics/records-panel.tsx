"use client";

import { differenceInCalendarDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Bike, Footprints, Waves } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PowerCurveChart } from "@/components/analytics/power-curve-chart";
import {
  AnalyticsSection,
  RecordsSectionHeader,
} from "@/components/analytics/analytics-cards";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecords } from "@/hooks/use-data";
import type { RecordCategory, RecordEntry } from "@/lib/records";
import { cn } from "@/lib/utils";

type SportTab = "run" | "bike" | "swim";

const TABS: {
  id: SportTab;
  label: string;
  icon: typeof Footprints;
}[] = [
  { id: "run", label: "Course", icon: Footprints },
  { id: "bike", label: "Vélo", icon: Bike },
  { id: "swim", label: "Natation", icon: Waves },
];

function isRecent(dateIso: string): boolean {
  return differenceInCalendarDays(new Date(), new Date(dateIso)) <= 14;
}

function entryMeta(entry: RecordEntry): string {
  const date = format(new Date(entry.date), "d MMM yyyy", { locale: fr });
  return entry.sublabel ? `${entry.sublabel} · ${date}` : date;
}

function RecordCategoryCard({ category }: { category: RecordCategory }) {
  const best = category.entries[0];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {category.label}
        </p>
        {best && isRecent(best.date) && (
          <Badge variant="outline" className="border-primary/30 text-primary">
            Nouveau
          </Badge>
        )}
      </div>

      {best ? (
        <>
          <RecordValue entry={best} />
          {category.entries.length > 1 && (
            <div className="mt-3 space-y-0.5 border-t border-border/60 pt-2">
              {category.entries.slice(1).map((entry) => (
                <RecordRow key={entry.rank} entry={entry} compact />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-muted-foreground/50">
          —
        </p>
      )}
    </div>
  );
}

function RecordValue({ entry }: { entry: RecordEntry }) {
  const inner = (
    <>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground">
        {entry.displayValue}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{entryMeta(entry)}</p>
    </>
  );

  if (!entry.activityId) return <div>{inner}</div>;
  return (
    <Link
      href={`/training/${entry.activityId}`}
      className="block rounded-md transition-colors hover:text-primary"
    >
      {inner}
    </Link>
  );
}

function RecordRow({
  entry,
  compact = false,
}: {
  entry: RecordEntry;
  compact?: boolean;
}) {
  const row = (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-1.5 text-sm",
        compact && "text-xs",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="w-5 shrink-0 font-mono text-muted-foreground">
          #{entry.rank}
        </span>
        <span className="font-mono font-semibold tabular-nums">
          {entry.displayValue}
        </span>
      </span>
      <span className="truncate text-right text-muted-foreground">
        {entryMeta(entry)}
      </span>
    </div>
  );

  if (!entry.activityId) return row;
  return (
    <Link
      href={`/training/${entry.activityId}`}
      className="block rounded-md px-1 transition-colors hover:bg-muted/50"
    >
      {row}
    </Link>
  );
}

function PrGrid({ categories }: { categories: RecordCategory[] }) {
  const filled = categories.filter((c) => c.entries.length > 0).length;
  const cols =
    filled <= 1
      ? "sm:grid-cols-1"
      : filled === 2
        ? "sm:grid-cols-2"
        : filled === 3
          ? "sm:grid-cols-2 lg:grid-cols-3"
          : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("grid gap-3", cols)}>
      {categories.map((category) => (
        <RecordCategoryCard key={category.key} category={category} />
      ))}
    </div>
  );
}

function GpsAnalysisSection({
  powerCurve,
}: {
  powerCurve: import("@/lib/records").PowerCurvePoint[];
}) {
  if (powerCurve.length === 0) return null;

  return (
    <AnalyticsSection
      title="Courbe de puissance"
      description="Puissance maximale soutenue par durée (vélo), calculée à partir des données capteur en cache."
    >
      <PowerCurveChart data={powerCurve} />
    </AnalyticsSection>
  );
}

export function RecordsPanel() {
  const { data, isLoading } = useRecords();
  const [tab, setTab] = useState<SportTab>("run");

  if (isLoading) {
    return <RecordsSkeleton />;
  }

  if (!data) return null;

  return (
    <section className="space-y-6 border-t border-border pt-12">
      <RecordsSectionHeader
        streamsAnalyzed={data.streamsAnalyzed}
        totalActivities={data.totalActivities}
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              tab === id
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "run" && (
        <AnalyticsSection
          title="Records course à pied"
          description="Meilleures performances agrégées depuis tes métriques de séance."
        >
          <PrGrid categories={data.prs.run} />
        </AnalyticsSection>
      )}

      {tab === "bike" && (
        <AnalyticsSection
          title="Records vélo"
          description="Puissance, dénivelé et durée — depuis tes sorties enregistrées."
        >
          <PrGrid categories={data.prs.bike} />
        </AnalyticsSection>
      )}

      {tab === "swim" && (
        <AnalyticsSection
          title="Records natation"
          description="Distance, allure et durée de tes séances natation."
        >
          <PrGrid categories={data.prs.swim} />
        </AnalyticsSection>
      )}

      <GpsAnalysisSection powerCurve={data.powerCurve} />
    </section>
  );
}

function RecordsSkeleton() {
  return (
    <section className="space-y-6 border-t border-border pt-12">
      <div className="flex gap-4">
        <Skeleton className="size-11 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-full" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </section>
  );
}
