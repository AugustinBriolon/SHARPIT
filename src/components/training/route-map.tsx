"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const RouteMapInner = dynamic(() => import("./route-map-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export function RouteMap({ path }: { path: [number, number][] }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-border/60">
      <RouteMapInner path={path} />
      <span className="pointer-events-none absolute bottom-1 right-2 z-[400] text-[9px] text-muted-foreground/70">
        © OpenStreetMap · CARTO
      </span>
    </div>
  );
}
