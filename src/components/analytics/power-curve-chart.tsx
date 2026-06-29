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
import type { PowerCurvePoint } from "@/lib/records";

interface PowerCurveChartProps {
  data: PowerCurvePoint[];
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PowerCurvePoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-muted-foreground">{point.label}</p>
      <p className="font-mono text-sm font-semibold text-foreground">
        {point.watts} W
      </p>
      {point.title && (
        <p className="mt-1 max-w-44 truncate text-muted-foreground">
          {point.title}
        </p>
      )}
    </div>
  );
}

export function PowerCurveChart({ data }: PowerCurveChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Courbe de puissance
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Puissance maximale moyenne soutenue par durée (vélo)
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Aucune donnée de puissance en cache. Ouvre des sorties vélo avec
            capteur de puissance pour alimenter la courbe.
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid stroke="oklch(0 0 0 / 8%)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "oklch(0.65 0.02 250)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  width={44}
                  tick={{ fill: "oklch(0.65 0.02 250)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  unit=" W"
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="watts"
                  name="Puissance"
                  stroke="#ea580c"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#ea580c" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
