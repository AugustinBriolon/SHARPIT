"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HealthChartPoint } from "@/lib/health";

interface MetricLineChartProps {
  title: string;
  subtitle?: string;
  data: HealthChartPoint[];
  dataKey: keyof HealthChartPoint;
  color: string;
  unit?: string;
}

function Tip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ value: number; color: string }>;
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length || payload[0].value == null) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-mono font-semibold" style={{ color: payload[0].color }}>
        {payload[0].value}
        {unit ? ` ${unit}` : ""}
      </p>
    </div>
  );
}

export function MetricLineChart({
  title,
  subtitle,
  data,
  dataKey,
  color,
  unit,
}: MetricLineChartProps) {
  const ticks = data.filter((_, i) => i % 10 === 0 || i === data.length - 1);
  const hasData = data.some((d) => d[dataKey] != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid stroke="oklch(1 0 0 / 6%)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  ticks={ticks.map((d) => d.label)}
                  tick={{ fill: "oklch(0.65 0.02 250)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fill: "oklch(0.65 0.02 250)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<Tip unit={unit} />} />
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Pas encore de données
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
