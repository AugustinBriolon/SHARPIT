"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS, type PmcPoint } from "@/lib/analytics";

interface LoadChartProps {
  data: PmcPoint[];
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
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-mono font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function LoadChart({ data }: LoadChartProps) {
  const ticks = data.filter((_, i) => i % 14 === 0 || i === data.length - 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Charge d&apos;entraînement
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          CTL (forme) · ATL (fatigue) · TSB (fraîcheur) — modèle Banister
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="oklch(1 0 0 / 6%)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                ticks={ticks.map((d) => d.label)}
                tick={{ fill: "oklch(0.65 0.02 250)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "oklch(0.65 0.02 250)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                formatter={(value) => (
                  <span className="text-muted-foreground">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="ctl"
                name="CTL"
                stroke={CHART_COLORS.ctl}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="atl"
                name="ATL"
                stroke={CHART_COLORS.atl}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="tsb"
                name="TSB"
                stroke={CHART_COLORS.tsb}
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
