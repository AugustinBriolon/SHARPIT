"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS, type SportDistribution } from "@/lib/analytics";

interface SportDistributionChartProps {
  data: SportDistribution[];
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SportDistribution }>;
}) {
  if (!active || !payload?.[0]) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{item.label}</p>
      <p className="text-muted-foreground">
        {item.hours}h · {item.count} séances · {item.percent}%
      </p>
    </div>
  );
}

export function SportDistributionChart({ data }: SportDistributionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Répartition par sport</CardTitle>
        <p className="text-xs text-muted-foreground">90 derniers jours — en heures</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6 md:flex-row">
          <div className="h-56 w-full md:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="hours"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.map((entry) => (
                    <Cell key={entry.type} fill={CHART_COLORS[entry.type]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full space-y-3 md:w-1/2">
            {data.map((sport) => (
              <div key={sport.type} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[sport.type] }}
                  />
                  <span>{sport.label}</span>
                </div>
                <div className="font-mono text-muted-foreground">
                  {sport.hours}h · {sport.percent}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
