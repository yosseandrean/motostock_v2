/**
 * Inventory dashboard computations: In Stock count, Invested, aging buckets,
 * Stale Units and Brand/Model/Color breakdowns. Kept as pure functions so the
 * dashboard page and its tests share one source of truth.
 */

import { invested, isSold } from "@/lib/unit";

/** An In Stock Unit becomes Stale once its Age exceeds this many days. */
export const STALE_THRESHOLD_DAYS = 90;

/** The four aging buckets, in the order they are shown. */
export const AGING_BUCKET_KEYS = [
  "under-30",
  "30-60",
  "60-90",
  "over-90",
] as const;

export type AgingBucketKey = (typeof AGING_BUCKET_KEYS)[number];

/** The fields the inventory dashboard reads from a Unit. */
export type DashboardUnit = {
  id: number;
  brand: string;
  model: string;
  color: string;
  licensePlate: string;
  buyPrice: number;
  cost: number;
  sellPrice: number | null;
  dateBought: Date;
};

export type AgingBucket = {
  key: AgingBucketKey;
  count: number;
  invested: number;
};

export type BreakdownRow = {
  key: string;
  count: number;
  invested: number;
};

export type StaleUnit = {
  id: number;
  brand: string;
  model: string;
  color: string;
  licensePlate: string;
  age: number;
  invested: number;
};

export type Dashboard = {
  inStockCount: number;
  totalInvested: number;
  agingBuckets: AgingBucket[];
  staleUnits: StaleUnit[];
  byBrand: BreakdownRow[];
  byModel: BreakdownRow[];
  byColor: BreakdownRow[];
};

/** Age in whole calendar days: the number of days since Date Bought. */
export function ageInDays(dateBought: Date, now: Date): number {
  const start = Date.UTC(
    dateBought.getUTCFullYear(),
    dateBought.getUTCMonth(),
    dateBought.getUTCDate(),
  );
  const end = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Math.floor((end - start) / 86_400_000);
}

/** The aging bucket an Age falls into. Buckets never overlap. */
export function agingBucket(age: number): AgingBucketKey {
  if (age < 30) {
    return "under-30";
  }
  if (age <= 60) {
    return "30-60";
  }
  if (age <= 90) {
    return "60-90";
  }
  return "over-90";
}

/** Whether an Age exceeds the stale threshold. */
export function isStale(age: number): boolean {
  return age > STALE_THRESHOLD_DAYS;
}

function accumulate(
  map: Map<string, { count: number; invested: number }>,
  key: string,
  value: number,
): void {
  const existing = map.get(key);
  if (existing === undefined) {
    map.set(key, { count: 1, invested: value });
  } else {
    existing.count += 1;
    existing.invested += value;
  }
}

function toBreakdown(
  map: Map<string, { count: number; invested: number }>,
): BreakdownRow[] {
  return [...map.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

/**
 * Aggregate the current inventory dashboard from a list of Units.
 *
 * Only In Stock Units (no Sell Price) contribute to the count, Invested,
 * aging buckets and breakdowns. Stale Units are In Stock Units whose Age
 * exceeds the stale threshold, listed oldest first.
 */
export function computeDashboard(
  units: readonly DashboardUnit[],
  now: Date,
): Dashboard {
  const inStock = units.filter((unit) => !isSold(unit));

  const buckets = new Map<AgingBucketKey, { count: number; invested: number }>(
    AGING_BUCKET_KEYS.map((key) => [key, { count: 0, invested: 0 }]),
  );
  const staleUnits: StaleUnit[] = [];
  const brandMap = new Map<string, { count: number; invested: number }>();
  const modelMap = new Map<string, { count: number; invested: number }>();
  const colorMap = new Map<string, { count: number; invested: number }>();

  let totalInvested = 0;
  for (const unit of inStock) {
    const value = invested(unit);
    const age = ageInDays(unit.dateBought, now);
    totalInvested += value;

    const bucket = buckets.get(agingBucket(age));
    if (bucket !== undefined) {
      bucket.count += 1;
      bucket.invested += value;
    }

    if (isStale(age)) {
      staleUnits.push({
        id: unit.id,
        brand: unit.brand,
        model: unit.model,
        color: unit.color,
        licensePlate: unit.licensePlate,
        age,
        invested: value,
      });
    }

    accumulate(brandMap, unit.brand, value);
    accumulate(modelMap, unit.model, value);
    accumulate(colorMap, unit.color, value);
  }

  staleUnits.sort((a, b) => b.age - a.age || a.brand.localeCompare(b.brand));

  return {
    inStockCount: inStock.length,
    totalInvested,
    agingBuckets: AGING_BUCKET_KEYS.map((key) => ({
      key,
      ...(buckets.get(key) ?? { count: 0, invested: 0 }),
    })),
    staleUnits,
    byBrand: toBreakdown(brandMap),
    byModel: toBreakdown(modelMap),
    byColor: toBreakdown(colorMap),
  };
}
