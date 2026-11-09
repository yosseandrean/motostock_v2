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
import { formatIDR } from "@/lib/format";
import type { SalesTrendPoint } from "@/lib/sales";
import { TREND_CHART_SERIES } from "@/lib/trend-chart";

/** Compact IDR labels for the Y axis ticks (e.g. 13000000 → "Rp 13 jt"). */
const compactIdr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/*
 * Dark "Grafit + Amber" chart palette, matching the design tokens in
 * app/globals.css. Recharts draws these as raw SVG/HTML attributes, so they
 * are spelled out here rather than referenced through Tailwind utilities.
 */
const GRID = "#272d34"; // grafit-800 (border)
const AXIS_LABEL = "#7f8894"; // grafit-400 (muted)
const TOOLTIP_BG = "#1b2026"; // grafit-900 (surface)
const TOOLTIP_BORDER = "#272d34"; // grafit-800 (border)
const TOOLTIP_TEXT = "#e9ebef"; // grafit-100 (foreground)
const TOOLTIP_LABEL = "#aeb5bf"; // grafit-300 (muted)
const CURSOR = "#373e47"; // grafit-700
const LEGEND = "#aeb5bf"; // grafit-300 (muted)
const ACCENT = "#fbbf24"; // amber-400 (accent line)
const SUCCESS = "#22c55e"; // green-500 (gross profit line)

/**
 * Recharts line chart of the sales trend (weekly or monthly buckets): one
 * series for Gross Profit (Laba Kotor, left axis) and one for revenue
 * (Pendapatan, right axis). Responsive so it fits a phone viewport; the
 * parent passes the already-computed trend points.
 */
export function MonthlyTrendChart({ data }: { data: SalesTrendPoint[] }) {
  return (
    <div className="trend-chart">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: AXIS_LABEL }}
            axisLine={{ stroke: GRID }}
            tickLine={{ stroke: GRID }}
          />
          {TREND_CHART_SERIES.map((series) => (
            <YAxis
              key={`axis-${series.dataKey}`}
              yAxisId={series.dataKey}
              orientation={series.axis}
              tick={{ fontSize: 12, fill: AXIS_LABEL }}
              tickFormatter={(value) => compactIdr.format(value)}
              axisLine={{ stroke: GRID }}
              tickLine={{ stroke: GRID }}
              width={76}
              label={{
                value: series.name,
                angle: series.axis === "left" ? -90 : 90,
                position: series.axis === "left" ? "insideLeft" : "insideRight",
                fill: AXIS_LABEL,
                fontSize: 12,
              }}
            />
          ))}
          <Tooltip
            formatter={(value) => formatIDR(Number(value))}
            cursor={{ stroke: CURSOR }}
            contentStyle={{
              backgroundColor: TOOLTIP_BG,
              border: `1px solid ${TOOLTIP_BORDER}`,
              borderRadius: 8,
            }}
            labelStyle={{ color: TOOLTIP_LABEL }}
            itemStyle={{ color: TOOLTIP_TEXT }}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: LEGEND }}>{value}</span>
            )}
          />
          {TREND_CHART_SERIES.map((series) => (
            <Line
              key={`line-${series.dataKey}`}
              yAxisId={series.dataKey}
              type="monotone"
              dataKey={series.dataKey}
              name={series.name}
              stroke={series.dataKey === "grossProfit" ? SUCCESS : ACCENT}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
