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

/** Compact IDR labels for the Y axis ticks (e.g. 13000000 → "Rp 13 jt"). */
const compactIdr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * Recharts line chart of the monthly sales trend: one series for revenue
 * (Pendapatan) and one for Gross Profit (Laba Kotor). Responsive so it fits a
 * phone viewport; the parent passes the already-computed trend points.
 */
export function MonthlyTrendChart({
  data,
}: {
  data: SalesTrendPoint[];
}) {
  return (
    <div className="trend-chart">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => compactIdr.format(value)}
            width={76}
          />
          <Tooltip formatter={(value) => formatIDR(Number(value))} />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Pendapatan"
            stroke="#1f6feb"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="grossProfit"
            name="Laba Kotor"
            stroke="#16a34a"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
