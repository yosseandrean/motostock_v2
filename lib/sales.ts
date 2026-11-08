/**
 * Sales dashboard computations: WIB period resolution, headline figures
 * (Units Sold, revenue, Gross Profit, Margin), Brand/Model/Sales Person
 * breakdowns, a monthly trend, and loss-making sales. Kept as pure functions
 * so the sales page and its tests share one source of truth.
 */

import { grossProfit } from "@/lib/unit";

/** WIB (Western Indonesian Time) is UTC+7. */
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

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

const ID_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

/** The UTC instant of a WIB-midnight calendar day (year/monthIndex/day). */
export function wibMidnightUtc(
  year: number,
  monthIndex: number,
  day: number,
): Date {
  return new Date(Date.UTC(year, monthIndex, day) - WIB_OFFSET_MS);
}

/** Parse a `YYYY-MM-DD` string into UTC midnight, or null when invalid. */
export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/** The WIB calendar month of `now`, as `{ year, monthIndex }`. */
function wibMonthOf(now: Date): { year: number; monthIndex: number } {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  return { year: wib.getUTCFullYear(), monthIndex: wib.getUTCMonth() };
}

/**
 * Resolve a preset into a half-open period of UTC instants aligned to WIB
 * midnights. `custom` needs both a from and a to `YYYY-MM-DD`; the days are
 * inclusive (to is advanced to the following WIB midnight).
 */
export function resolvePeriod(
  preset: SalesPresetKey,
  now: Date,
  custom?: { from: string; to: string },
): SalesPeriod {
  const { year, monthIndex } = wibMonthOf(now);

  switch (preset) {
    case "this-month":
      return {
        from: wibMidnightUtc(year, monthIndex, 1),
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
      if (!from || !to) {
        return { from: null, to: null };
      }
      return {
        from: wibMidnightUtc(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
        to: wibMidnightUtc(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() + 1),
      };
    }
  }
}

/** The WIB calendar month of a date, as a `YYYY-MM` key. */
export function monthKey(date: Date): string {
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  const year = wib.getUTCFullYear();
  const month = String(wib.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** The Indonesian label for a `YYYY-MM` month key. */
export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${ID_MONTHS[month - 1]} ${year}`;
}

/** A Unit counts as a sale only when Sell Price and Date Sold are both set. */
export function isSale(unit: Pick<SalesUnit, "sellPrice" | "dateSold">): boolean {
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
  profit: number,
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
  map: Map<string, { count: number; revenue: number; grossProfit: number }>,
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
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
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
  period: SalesPeriod,
): SalesSummary {
  const sales = units.filter(
    (unit): unit is SalesUnit =>
      isSale(unit) && unit.dateSold !== null && inPeriod(unit.dateSold, period),
  );

  let revenue = 0;
  let totalProfit = 0;
  let marginSum = 0;
  let marginCount = 0;
  const brandMap = new Map<string, { count: number; revenue: number; grossProfit: number }>();
  const modelMap = new Map<string, { count: number; revenue: number; grossProfit: number }>();
  const personMap = new Map<string, { count: number; revenue: number; grossProfit: number }>();
  const monthMap = new Map<string, { revenue: number; grossProfit: number }>();
  const losses: SalesLoss[] = [];

  for (const sale of sales) {
    const sellPrice = sale.sellPrice as number;
    const profit = grossProfit(sale) as number;
    revenue += sellPrice;
    totalProfit += profit;

    accumulate(brandMap, sale.brand, sellPrice, profit);
    accumulate(modelMap, sale.model, sellPrice, profit);
    accumulate(personMap, sale.salesPerson ?? "—", sellPrice, profit);

    const key = monthKey(sale.dateSold as Date);
    const bucket = monthMap.get(key);
    if (bucket === undefined) {
      monthMap.set(key, { revenue: sellPrice, grossProfit: profit });
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
  if (sales.length > 0 || period.from !== null || period.to !== null) {
    const fromKey =
      period.from !== null
        ? monthKey(period.from)
        : [...monthMap.keys()].sort()[0];
    const toKey =
      period.to !== null
        ? monthKey(new Date(period.to.getTime() - 1))
        : [...monthMap.keys()].sort().at(-1);
    if (fromKey !== undefined && toKey !== undefined) {
      for (const key of enumerateMonthKeys(fromKey, toKey)) {
        const bucket = monthMap.get(key);
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
