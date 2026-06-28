"use client";

import { ActivityType } from "@prisma/client";
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
import type { StreamSample } from "@/lib/streams";

export function CombinedChart({
  samples,
  has,
  type,
}: {
  samples: StreamSample[];
  has: { distance: boolean; altitude: boolean; hr: boolean; watts: boolean };
  type: ActivityType;
}) {
  const useDistance = has.distance;
  const showAlt = has.altitude && has.hr;
  const showPower = has.watts && has.hr && type === ActivityType.BIKE;

  if (!showAlt && !showPower) return null;

  const secondaryKey = showPower ? "watts" : "alt";
  const secondaryLabel = showPower ? "Puissance (W)" : "Altitude (m)";
  const secondaryColor = showPower ? "#fbbf24" : "#34d399";

  const data = samples.map((s) => ({
    x: useDistance
      ? Number((s.d / 1000).toFixed(2))
      : Number((s.t / 60).toFixed(1)),
    hr: s.hr,
    [secondaryKey]: showPower ? s.watts : s.alt,
  }));

  const xLabel = useDistance ? "km" : "min";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          FC + {showPower ? "puissance" : "altitude"}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Corrélation effort / réponse cardiovasculaire
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, left: -8, bottom: 0 }}
            >
              <CartesianGrid stroke="oklch(1 0 0 / 6%)" strokeDasharray="3 3" />
              <XAxis
                dataKey="x"
                type="number"
                domain={["dataMin", "dataMax"]}
                tick={{ fill: "oklch(0.65 0.02 250)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="hr"
                tick={{ fill: "#f43f5e", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <YAxis
                yAxisId="sec"
                orientation="right"
                tick={{ fill: secondaryColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs shadow-lg">
                      <p className="mb-1 text-muted-foreground">
                        {label} {xLabel}
                      </p>
                      {payload.map((p) => (
                        <p key={String(p.dataKey)} style={{ color: p.color }}>
                          {p.dataKey === "hr" ? "FC" : secondaryLabel.split(" ")[0]}:{" "}
                          <span className="font-mono font-semibold">{p.value}</span>
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Line
                yAxisId="hr"
                type="monotone"
                dataKey="hr"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                yAxisId="sec"
                type="monotone"
                dataKey={secondaryKey}
                stroke={secondaryColor}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
