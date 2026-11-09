/**
 * The Tren chart's series configuration, shared by the sales page (which
 * serializes it into the page for the HTTP seam) and the client-side chart.
 *
 * Entry order is the axis order: Laba Kotor first (left Y axis), Pendapatan
 * second (right Y axis). `dataKey` matches a field on `SalesTrendPoint`.
 */

export type TrendSeriesKey = "grossProfit" | "revenue";

export type TrendChartSeries = {
  dataKey: TrendSeriesKey;
  name: string;
  axis: "left" | "right";
};

export const TREND_CHART_SERIES: readonly TrendChartSeries[] = [
  { dataKey: "grossProfit", name: "Laba Kotor", axis: "left" },
  { dataKey: "revenue", name: "Pendapatan", axis: "right" },
];
