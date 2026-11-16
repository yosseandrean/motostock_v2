/**
 * Sales dashboard computations: WIB period resolution, headline figures
 * (Units Sold, revenue, Gross Profit, Margin), Brand/Model/Sales Person
 * breakdowns, a trend, and loss-making sales. The trend is weekly for short
 * periods (≤ 31 days) and monthly otherwise. Kept as pure functions so the
 * sales page and its tests share one source of truth.
 */

import {
  ID_MONTHS_SHORT,
  monthKey,
  monthLabel,
  parseDateOnly,
  wibDateKey,
  wibDateParts,
  wibMidnightUtc,
  wibMonthStart,
} from "@/lib/calendar";
import { grossProfit } from "@/lib/unit";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/**
 * A period is bucketed weekly only when both bounds are known and the span is
 * at most 31 days (a single WIB calendar month or a short custom range).
 */
const WEEKLY_MAX_SPAN_MS = 31 * DAY_MS;

export const SALES_PRESETS = [
  { key: "this-month", label: "Bulan ini" },
  { key: "last-month", label: "Bulan lalu" },
  { key: "last-3-months", label: "3 bulan terakhir" },
  { key: "this-year", label: "Tahun ini" },
  { key: "all-time", label: "Semua waktu" },
  { key: "custom", label: "Kustom" },
] as const;

export type SalesPresetKey = (typeof SALES_PRESETS)[number]["key"];

/** The fields the sales dashboard reads from a Unit. */
export type SalesUnit = {
  id: number;
  brand: string;
  model: string;
  salesPerson: string | null;
  buyPrice: number;
  cost: number;
  sellPrice: number | null;
  dateSold: Date | null;
};

/** A half-open UTC-instant range; `null` means unbounded on that side. */
export type SalesPeriod = {
  from: Date | null;
  to: Date | null;
};

export type SalesBreakdownRow = {
  key: string;
  count: number;
  revenue: number;
  grossProfit: number;
};

export type SalesTrendPoint = {
  key: string;
  label: string;
  revenue: number;
  grossProfit: number;
};

export type SalesLoss = {
  id: number;
  brand: string;
  model: string;
  sellPrice: number;
  grossProfit: number;
};

export type SalesSummary = {
  unitsSold: number;
  revenue: number;
  grossProfit: number;
  /** Average Margin across Sold Units: mean of (Gross Profit ÷ Sell Price). */
  margin: number | null;
  byBrand: SalesBreakdownRow[];
  byModel: SalesBreakdownRow[];
  bySalesPerson: SalesBreakdownRow[];
  trend: SalesTrendPoint[];
  losses: SalesLoss[];
};

/**
 * Resolve a preset into a half-open period of UTC instants aligned to WIB
 * midnights. `custom` needs both a from and a to `YYYY-MM-DD`; the days are
 * inclusive (to is advanced to the following WIB midnight).
 */
export function resolvePeriod(
  preset: SalesPresetKey,
  now: Date,
  custom?: { from: string; to: string }
): SalesPeriod {
  const { year, monthIndex } = wibDateParts(now);

  switch (preset) {
    case "this-month":
      return {
        from: wibMonthStart(now),
        to: wibMidnightUtc(year, monthIndex + 1, 1),
      };
    case "last-month":
      return {
        from: wibMidnightUtc(year, monthIndex - 1, 1),
        to: wibMidnightUtc(year, monthIndex, 1),
      };
    case "last-3-months":
      return {
        from: wibMidnightUtc(year, monthIndex - 2, 1),
        to: wibMidnightUtc(year, monthIndex + 1, 1),
      };
    case "this-year":
      return {
        from: wibMidnightUtc(year, 0, 1),
        to: wibMidnightUtc(year + 1, 0, 1),
      };
    case "all-time":
      return { from: null, to: null };
    case "custom": {
      const from = custom ? parseDateOnly(custom.from) : null;
      const to = custom ? parseDateOnly(custom.to) : null;
      if (!(from instanceof Date) || !(to instanceof Date)) {
        return { from: null, to: null };
      }
      return {
        from: wibMidnightUtc(
          from.getUTCFullYear(),
          from.getUTCMonth(),
          from.getUTCDate()
        ),
        to: wibMidnightUtc(
          to.getUTCFullYear(),
          to.getUTCMonth(),
          to.getUTCDate() + 1
        ),
      };
    }
  }
}

/** The start of the `index`-th 7-day window after the period start. */
function weekStart(from: Date, index: number): Date {
  return new Date(from.getTime() + index * WEEK_MS);
}

/** The key of the weekly bucket a sale falls into, anchored at `from`. */
function weekBucketKey(from: Date, dateSold: Date): string {
  const index = Math.floor((dateSold.getTime() - from.getTime()) / WEEK_MS);
  return wibDateKey(weekStart(from, index));
}

/** True when `period` should be bucketed weekly rather than monthly. */
function isWeeklyPeriod(period: SalesPeriod): boolean {
  return (
    period.from !== null &&
    period.to !== null &&
    period.to.getTime() - period.from.getTime() <= WEEKLY_MAX_SPAN_MS
  );
}

/** Short Indonesian day range for a weekly bucket, clipped to the period. */
function weekBucketLabel(
  from: Date,
  index: number,
  period: SalesPeriod
): string {
  const start = weekStart(from, index);
  const end = new Date(
    Math.min(start.getTime() + WEEK_MS, (period.to as Date).getTime())
  );
  const startParts = wibDateParts(start);
  const endParts = wibDateParts(new Date(end.getTime() - 1));
  const startMonth = ID_MONTHS_SHORT[startParts.monthIndex];
  const endMonth = ID_MONTHS_SHORT[endParts.monthIndex];

  if (
    startParts.year === endParts.year &&
    startParts.monthIndex === endParts.monthIndex
  ) {
    return `${startParts.day}–${endParts.day} ${startMonth}`;
  }
  if (startParts.year === endParts.year) {
    return `${startParts.day} ${startMonth}–${endParts.day} ${endMonth}`;
  }
  return `${startParts.day} ${startMonth} ${startParts.year}–${endParts.day} ${endMonth} ${endParts.year}`;
}

/** Enumerate weekly buckets across the period, zero-filling empty weeks. */
function buildWeeklyTrend(
  buckets: Map<string, { revenue: number; grossProfit: number }>,
  period: SalesPeriod
): SalesTrendPoint[] {
  const from = period.from as Date;
  const to = period.to as Date;
  const points: SalesTrendPoint[] = [];
  for (
    let index = 0;
    weekStart(from, index).getTime() < to.getTime();
    index += 1
  ) {
    const key = wibDateKey(weekStart(from, index));
    const bucket = buckets.get(key);
    points.push({
      key,
      label: weekBucketLabel(from, index, period),
      revenue: bucket?.revenue ?? 0,
      grossProfit: bucket?.grossProfit ?? 0,
    });
  }
  return points;
}

/** A Unit counts as a sale only when Sell Price and Date Sold are both set. */
export function isSale(
  unit: Pick<SalesUnit, "sellPrice" | "dateSold">
): boolean {
  return unit.sellPrice !== null && unit.dateSold !== null;
}

function inPeriod(dateSold: Date, period: SalesPeriod): boolean {
  return (
    (period.from === null || dateSold >= period.from) &&
    (period.to === null || dateSold < period.to)
  );
}

function accumulate(
  map: Map<string, { count: number; revenue: number; grossProfit: number }>,
  key: string,
  revenue: number,
  profit: number
): void {
  const existing = map.get(key);
  if (existing === undefined) {
    map.set(key, { count: 1, revenue, grossProfit: profit });
  } else {
    existing.count += 1;
    existing.revenue += revenue;
    existing.grossProfit += profit;
  }
}

function toBreakdown(
  map: Map<string, { count: number; revenue: number; grossProfit: number }>
): SalesBreakdownRow[] {
  return [...map.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function parseMonthKey(key: string): { year: number; month: number } {
  const [year, month] = key.split("-").map(Number);
  return { year, month };
}

function enumerateMonthKeys(fromKey: string, toKey: string): string[] {
  const keys: string[] = [];
  const from = parseMonthKey(fromKey);
  const to = parseMonthKey(toKey);
  let year = from.year;
  let month = from.month;
  while (year < to.year || (year === to.year && month <= to.month)) {
    keys.push(monthKey(wibMidnightUtc(year, month - 1, 1)));
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}

/**
 * Aggregate a sales summary over a half-open period (WIB-aligned bounds).
 *
 * Only Units with both a Sell Price and Date Sold inside the period count.
 * Margin is the mean per-unit Margin (Gross Profit ÷ Sell Price), null when
 * nothing sold. Units with a non-positive Sell Price are excluded from the
 * average (their Margin is undefined).
 */
export function computeSalesSummary(
  units: readonly SalesUnit[],
  period: SalesPeriod
): SalesSummary {
  const sales = units.filter(
    (unit): unit is SalesUnit =>
      isSale(unit) && unit.dateSold !== null && inPeriod(unit.dateSold, period)
  );

  let revenue = 0;
  let totalProfit = 0;
  let marginSum = 0;
  let marginCount = 0;
  const brandMap = new Map<
    string,
    { count: number; revenue: number; grossProfit: number }
  >();
  const modelMap = new Map<
    string,
    { count: number; revenue: number; grossProfit: number }
  >();
  const personMap = new Map<
    string,
    { count: number; revenue: number; grossProfit: number }
  >();
  const trendBuckets = new Map<
    string,
    { revenue: number; grossProfit: number }
  >();
  const weekly = isWeeklyPeriod(period);
  const losses: SalesLoss[] = [];

  for (const sale of sales) {
    const sellPrice = sale.sellPrice as number;
    const profit = grossProfit(sale) as number;
    revenue += sellPrice;
    totalProfit += profit;

    accumulate(brandMap, sale.brand, sellPrice, profit);
    accumulate(modelMap, sale.model, sellPrice, profit);
    accumulate(personMap, sale.salesPerson ?? "—", sellPrice, profit);

    const key = weekly
      ? weekBucketKey(period.from as Date, sale.dateSold as Date)
      : monthKey(sale.dateSold as Date);
    const bucket = trendBuckets.get(key);
    if (bucket === undefined) {
      trendBuckets.set(key, { revenue: sellPrice, grossProfit: profit });
    } else {
      bucket.revenue += sellPrice;
      bucket.grossProfit += profit;
    }

    if (sellPrice > 0) {
      marginSum += profit / sellPrice;
      marginCount += 1;
    }

    if (profit < 0) {
      losses.push({
        id: sale.id,
        brand: sale.brand,
        model: sale.model,
        sellPrice,
        grossProfit: profit,
      });
    }
  }

  const trend: SalesTrendPoint[] = [];
  if (weekly) {
    trend.push(...buildWeeklyTrend(trendBuckets, period));
  } else if (sales.length > 0 || period.from !== null || period.to !== null) {
    const fromKey =
      period.from !== null
        ? monthKey(period.from)
        : [...trendBuckets.keys()].sort()[0];
    const toKey =
      period.to !== null
        ? monthKey(new Date(period.to.getTime() - 1))
        : [...trendBuckets.keys()].sort().at(-1);
    if (fromKey !== undefined && toKey !== undefined) {
      for (const key of enumerateMonthKeys(fromKey, toKey)) {
        const bucket = trendBuckets.get(key);
        trend.push({
          key,
          label: monthLabel(key),
          revenue: bucket?.revenue ?? 0,
          grossProfit: bucket?.grossProfit ?? 0,
        });
      }
    }
  }

  losses.sort((a, b) => a.grossProfit - b.grossProfit);

  return {
    unitsSold: sales.length,
    revenue,
    grossProfit: totalProfit,
    margin: marginCount === 0 ? null : marginSum / marginCount,
    byBrand: toBreakdown(brandMap),
    byModel: toBreakdown(modelMap),
    bySalesPerson: toBreakdown(personMap),
    trend,
    losses,
  };
}
