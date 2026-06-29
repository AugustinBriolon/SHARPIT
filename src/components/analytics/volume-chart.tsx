"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS, type WeeklyVolumePoint } from "@/lib/analytics";

interface VolumeChartProps {
  data: WeeklyVolumePoint[];
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, e) => s + e.value, 0);
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-mono">{entry.value}h</span>
        </p>
      ))}
      <p className="mt-1 border-t border-border/40 pt-1 text-muted-foreground">
        Total: <span className="font-mono font-semibold text-foreground">{total.toFixed(1)}h</span>
      </p>
    </div>
  );
}

const SPORTS = [
  { key: "RUN" as const, label: "Course" },
  { key: "BIKE" as const, label: "Vélo" },
  { key: "SWIM" as const, label: "Natation" },
  { key: "STRENGTH" as const, label: "Muscu" },
];

export function VolumeChart({ data }: VolumeChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Volume hebdomadaire</CardTitle>
        <p className="text-xs text-muted-foreground">Heures par sport — 16 dernières semaines</p>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="oklch(0 0 0 / 8%)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "oklch(0.65 0.02 250)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "oklch(0.65 0.02 250)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                unit="h"
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                formatter={(value) => (
                  <span className="text-muted-foreground">{value}</span>
                )}
              />
              {SPORTS.map((sport) => (
                <Bar
                  key={sport.key}
                  dataKey={sport.key}
                  name={sport.label}
                  stackId="volume"
                  fill={CHART_COLORS[sport.key]}
                  radius={sport.key === "STRENGTH" ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
