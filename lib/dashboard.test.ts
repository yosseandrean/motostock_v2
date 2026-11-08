import { describe, expect, it } from "vitest";
import {
  ageInDays,
  agingBucket,
  computeDashboard,
  isStale,
} from "@/lib/dashboard";
import type { DashboardUnit } from "@/lib/dashboard";

const NOW = new Date("2026-03-01T00:00:00.000Z");

/** A Date Bought exactly `daysAgo` calendar days before NOW. */
function bought(daysAgo: number): Date {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date;
}

function unit(overrides: Partial<DashboardUnit> = {}): DashboardUnit {
  return {
    id: 1,
    brand: "HONDA",
    model: "BEAT",
    color: "MERAH",
    licensePlate: "B 1 AAA",
    buyPrice: 10_000_000,
    cost: 500_000,
    sellPrice: null,
    dateBought: bought(0),
    ...overrides,
  };
}

describe("ageInDays", () => {
  it("is the number of calendar days since Date Bought", () => {
    expect(ageInDays(bought(0), NOW)).toBe(0);
    expect(ageInDays(bought(1), NOW)).toBe(1);
    expect(ageInDays(bought(30), NOW)).toBe(30);
    expect(ageInDays(bought(91), NOW)).toBe(91);
  });
});

describe("agingBucket", () => {
  it("places each Age into exactly one bucket", () => {
    expect(agingBucket(0)).toBe("under-30");
    expect(agingBucket(29)).toBe("under-30");
    expect(agingBucket(30)).toBe("30-60");
    expect(agingBucket(60)).toBe("30-60");
    expect(agingBucket(61)).toBe("60-90");
    expect(agingBucket(90)).toBe("60-90");
    expect(agingBucket(91)).toBe("over-90");
  });
});

describe("isStale", () => {
  it("is true only when Age exceeds the 90-day threshold", () => {
    expect(isStale(90)).toBe(false);
    expect(isStale(91)).toBe(true);
  });
});

describe("computeDashboard", () => {
  it("counts In Stock Units and totals their Invested, ignoring Sold Units", () => {
    const units: DashboardUnit[] = [
      unit({ id: 1, buyPrice: 10_000_000, cost: 500_000 }),
      unit({ id: 2, buyPrice: 11_000_000, cost: 1_000_000 }),
      // Sold Unit must not contribute.
      unit({ id: 3, brand: "SUZUKI", sellPrice: 15_000_000 }),
    ];

    const dashboard = computeDashboard(units, NOW);

    expect(dashboard.inStockCount).toBe(2);
    expect(dashboard.totalInvested).toBe(22_500_000);
  });

  it("places each In Stock Unit into the right aging bucket with its Invested", () => {
    const units: DashboardUnit[] = [
      unit({ id: 1, dateBought: bought(0), buyPrice: 10_000_000, cost: 500_000 }),
      unit({ id: 2, dateBought: bought(30), buyPrice: 11_000_000, cost: 1_000_000 }),
      unit({ id: 3, dateBought: bought(61), buyPrice: 20_000_000, cost: 1_000_000 }),
      unit({ id: 4, dateBought: bought(91), buyPrice: 22_000_000, cost: 2_000_000 }),
    ];

    const dashboard = computeDashboard(units, NOW);

    expect(dashboard.agingBuckets).toEqual([
      { key: "under-30", count: 1, invested: 10_500_000 },
      { key: "30-60", count: 1, invested: 12_000_000 },
      { key: "60-90", count: 1, invested: 21_000_000 },
      { key: "over-90", count: 1, invested: 24_000_000 },
    ]);
  });

  it("lists Stale Units (Age over 90 days), oldest first", () => {
    const units: DashboardUnit[] = [
      unit({ id: 1, dateBought: bought(91), brand: "YAMAHA", model: "NMAX" }),
      unit({ id: 2, dateBought: bought(90), brand: "HONDA", model: "PCX" }),
      unit({ id: 3, dateBought: bought(120), brand: "HONDA", model: "BEAT" }),
    ];

    const dashboard = computeDashboard(units, NOW);

    expect(dashboard.staleUnits.map((stale) => stale.id)).toEqual([3, 1]);
    expect(dashboard.staleUnits[0]).toMatchObject({
      id: 3,
      brand: "HONDA",
      model: "BEAT",
      age: 120,
      invested: 10_500_000,
    });
  });

  it("breaks down In Stock Units by Brand and Model with counts and Invested", () => {
    const units: DashboardUnit[] = [
      unit({ id: 1, brand: "HONDA", model: "BEAT", color: "MERAH", buyPrice: 10_000_000, cost: 500_000 }),
      unit({ id: 2, brand: "HONDA", model: "BEAT", color: "HITAM", buyPrice: 11_000_000, cost: 1_000_000 }),
      unit({ id: 3, brand: "YAMAHA", model: "NMAX", color: "HITAM", buyPrice: 20_000_000, cost: 1_000_000 }),
      unit({ id: 4, brand: "YAMAHA", model: "NMAX", color: "BIRU", buyPrice: 22_000_000, cost: 2_000_000 }),
    ];

    const dashboard = computeDashboard(units, NOW);

    expect(dashboard.byBrand).toEqual([
      { key: "HONDA", count: 2, invested: 22_500_000 },
      { key: "YAMAHA", count: 2, invested: 45_000_000 },
    ]);
    expect(dashboard.byModel).toEqual([
      { key: "BEAT", count: 2, invested: 22_500_000 },
      { key: "NMAX", count: 2, invested: 45_000_000 },
    ]);
  });

  it("returns an empty dashboard when there are no In Stock Units", () => {
    const dashboard = computeDashboard(
      [unit({ sellPrice: 15_000_000 })],
      NOW,
    );

    expect(dashboard.inStockCount).toBe(0);
    expect(dashboard.totalInvested).toBe(0);
    expect(dashboard.agingBuckets).toEqual([
      { key: "under-30", count: 0, invested: 0 },
      { key: "30-60", count: 0, invested: 0 },
      { key: "60-90", count: 0, invested: 0 },
      { key: "over-90", count: 0, invested: 0 },
    ]);
    expect(dashboard.staleUnits).toEqual([]);
    expect(dashboard.byBrand).toEqual([]);
    expect(dashboard.byModel).toEqual([]);
  });
});
