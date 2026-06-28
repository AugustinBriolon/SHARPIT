"use client";

import { ActivityType } from "@prisma/client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StreamSample } from "@/lib/streams";

interface ChartPoint {
  x: number; // distance (km) ou temps (min)
  alt: number | null;
  hr: number | null;
  watts: number | null;
  cadence: number | null;
  speed: number | null; // km/h
  pace: number | null; // sec/km
}

interface MetricConfig {
  key: keyof Omit<ChartPoint, "x">;
  label: string;
  color: string;
  unit: string;
  format?: (v: number) => string;
}

function paceFmt(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${s.toString().padStart(2, "0")}`;
}

export function ActivityCharts({
  samples,
  has,
  type,
}: {
  samples: StreamSample[];
  has: {
    distance: boolean;
    altitude: boolean;
    hr: boolean;
    watts: boolean;
    cadence: boolean;
    speed: boolean;
  };
  type: ActivityType;
}) {
  const useDistance = has.distance;

  const data: ChartPoint[] = samples.map((s) => {
    const speedKmh = s.speed != null ? s.speed * 3.6 : null;
    const pace = s.speed != null && s.speed > 0.3 ? 1000 / s.speed : null;
    return {
      x: useDistance
        ? Number((s.d / 1000).toFixed(3))
        : Number((s.t / 60).toFixed(2)),
      alt: s.alt,
      hr: s.hr,
      watts: s.watts,
      cadence: s.cadence,
      speed: speedKmh != null ? Number(speedKmh.toFixed(1)) : null,
      pace: pace != null ? Math.round(pace) : null,
    };
  });

  const metrics: MetricConfig[] = [];
  if (has.altitude)
    metrics.push({
      key: "alt",
      label: "Altitude",
      color: "#34d399",
      unit: "m",
    });
  if (has.hr)
    metrics.push({
      key: "hr",
      label: "Fréquence cardiaque",
      color: "#f43f5e",
      unit: "bpm",
    });
  if (has.watts)
    metrics.push({
      key: "watts",
      label: "Puissance",
      color: "#fbbf24",
      unit: "W",
    });
  // Course : allure ; autres : vitesse
  if (has.speed && type === ActivityType.RUN)
    metrics.push({
      key: "pace",
      label: "Allure",
      color: "#fb923c",
      unit: "/km",
      format: paceFmt,
    });
  else if (has.speed)
    metrics.push({
      key: "speed",
      label: "Vitesse",
      color: "#22d3ee",
      unit: "km/h",
    });
  if (has.cadence)
    metrics.push({
      key: "cadence",
      label: "Cadence",
      color: "#a78bfa",
      unit: type === ActivityType.RUN ? "spm" : "rpm",
    });

  if (!metrics.length) return null;

  const xLabel = useDistance ? "km" : "min";
  const xFmt = (v: number) =>
    useDistance ? `${v.toFixed(0)}` : `${Math.round(v)}`;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {metrics.map((m) => (
        <Card key={m.key}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              {m.label}
              <span className="text-xs font-normal text-muted-foreground">
                ({m.unit})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 5, right: 10, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id={`grad-${m.key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={m.color} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={m.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="oklch(1 0 0 / 6%)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={xFmt}
                    tick={{ fill: "oklch(0.65 0.02 250)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    unit={xLabel === "km" ? "" : ""}
                  />
                  <YAxis
                    domain={
                      m.key === "pace"
                        ? ["dataMax", "dataMin"]
                        : ["auto", "auto"]
                    }
                    tickFormatter={
                      m.format ? (v: number) => m.format!(v) : undefined
                    }
                    tick={{ fill: "oklch(0.65 0.02 250)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const v = payload[0].value as number;
                      return (
                        <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs shadow-lg">
                          <p className="mb-1 text-muted-foreground">
                            {xFmt(Number(label))} {xLabel}
                          </p>
                          <p style={{ color: m.color }}>
                            <span className="font-mono font-semibold">
                              {m.format ? m.format(v) : v}
                            </span>{" "}
                            {m.unit}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={m.key}
                    stroke={m.color}
                    strokeWidth={2}
                    fill={`url(#grad-${m.key})`}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
