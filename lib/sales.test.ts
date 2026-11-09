import { describe, expect, it } from "vitest";
import {
  computeSalesSummary,
  isSale,
  monthKey,
  monthLabel,
  parseDateOnly,
  resolvePeriod,
  wibMidnightUtc,
} from "@/lib/sales";
import type { SalesPeriod, SalesUnit } from "@/lib/sales";

const NOW = new Date("2026-11-15T10:00:00.000Z");

function unit(overrides: Partial<SalesUnit> = {}): SalesUnit {
  return {
    id: 1,
    brand: "HONDA",
    model: "BEAT",
    salesPerson: "HASAN",
    buyPrice: 10_000_000,
    cost: 0,
    sellPrice: 12_000_000,
    dateSold: new Date("2026-11-01T00:00:00.000Z"),
    ...overrides,
  };
}

function period(preset: Parameters<typeof resolvePeriod>[0]): SalesPeriod {
  return resolvePeriod(preset, NOW);
}

describe("wibMidnightUtc", () => {
  it("returns the UTC instant of a WIB-midnight calendar day", () => {
    expect(wibMidnightUtc(2026, 10, 1).toISOString()).toBe(
      "2026-10-31T17:00:00.000Z",
    );
  });
});

describe("parseDateOnly", () => {
  it("parses a valid YYYY-MM-DD into UTC midnight", () => {
    const date = parseDateOnly("2026-11-01");
    expect(date?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("rejects malformed or impossible dates", () => {
    expect(parseDateOnly("2026-02-30")).toBeNull();
    expect(parseDateOnly("not-a-date")).toBeNull();
    expect(parseDateOnly("2026-1-1")).toBeNull();
  });
});

describe("resolvePeriod", () => {
  it("computes This month boundaries in WIB", () => {
    const { from, to } = resolvePeriod("this-month", NOW);
    expect(from?.toISOString()).toBe("2026-10-31T17:00:00.000Z");
    expect(to?.toISOString()).toBe("2026-11-30T17:00:00.000Z");
  });

  it("computes Last month boundaries in WIB", () => {
    const { from, to } = resolvePeriod("last-month", NOW);
    expect(from?.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(to?.toISOString()).toBe("2026-10-31T17:00:00.000Z");
  });

  it("computes Last 3 months as the current and two previous calendar months", () => {
    const { from, to } = resolvePeriod("last-3-months", NOW);
    expect(from?.toISOString()).toBe("2026-08-31T17:00:00.000Z");
    expect(to?.toISOString()).toBe("2026-11-30T17:00:00.000Z");
  });

  it("computes This year boundaries in WIB", () => {
    const { from, to } = resolvePeriod("this-year", NOW);
    expect(from?.toISOString()).toBe("2025-12-31T17:00:00.000Z");
    expect(to?.toISOString()).toBe("2026-12-31T17:00:00.000Z");
  });

  it("has no bounds for All time", () => {
    expect(resolvePeriod("all-time", NOW)).toEqual({ from: null, to: null });
  });

  it("interprets Custom from/to as inclusive WIB days", () => {
    const { from, to } = resolvePeriod("custom", NOW, {
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(from?.toISOString()).toBe("2026-08-31T17:00:00.000Z");
    expect(to?.toISOString()).toBe("2026-09-30T17:00:00.000Z");
  });

  it("rounds a late-UTC hour into the correct WIB month", () => {
    // 2026-10-31T23:00Z is already November 1st in WIB.
    const late = new Date("2026-10-31T23:00:00.000Z");
    const { from } = resolvePeriod("this-month", late);
    expect(from?.toISOString()).toBe("2026-10-31T17:00:00.000Z");
  });
});

describe("monthKey / monthLabel", () => {
  it("maps a stored date to its WIB calendar month", () => {
    expect(monthKey(new Date("2026-11-01T00:00:00.000Z"))).toBe("2026-11");
    expect(monthKey(new Date("2026-10-31T23:00:00.000Z"))).toBe("2026-11");
  });

  it("labels a month key in Indonesian", () => {
    expect(monthLabel("2026-11")).toBe("November 2026");
    expect(monthLabel("2026-01")).toBe("Januari 2026");
  });
});

describe("isSale", () => {
  it("is true only when both Sell Price and Date Sold are set", () => {
    expect(isSale(unit())).toBe(true);
    expect(isSale(unit({ sellPrice: null, dateSold: null }))).toBe(false);
    expect(isSale(unit({ dateSold: null }))).toBe(false);
  });
});

describe("computeSalesSummary", () => {
  it("counts only Sold Units inside the period, including WIB boundaries", () => {
    const units: SalesUnit[] = [
      unit({ id: 1, dateSold: new Date("2026-11-01T00:00:00.000Z") }),
      // October 31st is before This month's WIB boundary.
      unit({ id: 2, dateSold: new Date("2026-10-31T00:00:00.000Z") }),
      // In Stock (no Sell Price) is never a sale.
      unit({ id: 3, sellPrice: null, dateSold: null }),
      // A half-pair (Sell Price without Date Sold) is not a sale.
      unit({ id: 4, dateSold: null }),
    ];

    const summary = computeSalesSummary(units, period("this-month"));

    expect(summary.unitsSold).toBe(1);
    expect(summary.revenue).toBe(12_000_000);
    expect(summary.grossProfit).toBe(2_000_000);
  });

  it("sums revenue and Gross Profit and averages the per-unit margins", () => {
    const units: SalesUnit[] = [
      unit({ id: 1, buyPrice: 8_000_000, sellPrice: 10_000_000 }),
      unit({ id: 2, buyPrice: 15_000_000, sellPrice: 20_000_000 }),
    ];

    const summary = computeSalesSummary(units, period("this-month"));

    expect(summary.revenue).toBe(30_000_000);
    expect(summary.grossProfit).toBe(7_000_000);
    // (10-8)/10 = 0.2, (20-15)/20 = 0.25 → mean 0.225.
    expect(summary.margin).toBeCloseTo(0.225, 6);
  });

  it("returns a null margin when there is no revenue", () => {
    const summary = computeSalesSummary([], period("this-month"));
    expect(summary.margin).toBeNull();
  });

  it("breaks down by Brand, Model and Sales Person with counts and money", () => {
    const units: SalesUnit[] = [
      unit({ id: 1, brand: "HONDA", model: "BEAT", salesPerson: "HASAN", buyPrice: 10_000_000, sellPrice: 12_000_000 }),
      unit({ id: 2, brand: "HONDA", model: "PCX", salesPerson: "BUDI", buyPrice: 15_000_000, sellPrice: 20_000_000 }),
      unit({ id: 3, brand: "YAMAHA", model: "NMAX", salesPerson: "HASAN", buyPrice: 20_000_000, sellPrice: 30_000_000 }),
    ];

    const summary = computeSalesSummary(units, period("this-month"));

    expect(summary.byBrand).toEqual([
      { key: "HONDA", count: 2, revenue: 32_000_000, grossProfit: 7_000_000 },
      { key: "YAMAHA", count: 1, revenue: 30_000_000, grossProfit: 10_000_000 },
    ]);
    expect(summary.byModel.map((row) => row.key)).toEqual(["BEAT", "NMAX", "PCX"]);
    expect(summary.bySalesPerson).toEqual([
      { key: "HASAN", count: 2, revenue: 42_000_000, grossProfit: 12_000_000 },
      { key: "BUDI", count: 1, revenue: 20_000_000, grossProfit: 5_000_000 },
    ]);
  });

  it("builds a monthly trend across the period, zero-filling empty months", () => {
    const units: SalesUnit[] = [
      unit({ id: 1, dateSold: new Date("2026-09-15T00:00:00.000Z"), buyPrice: 10_000_000, sellPrice: 12_000_000 }),
      unit({ id: 2, dateSold: new Date("2026-11-10T00:00:00.000Z"), buyPrice: 15_000_000, sellPrice: 20_000_000 }),
    ];

    const summary = computeSalesSummary(units, period("last-3-months"));

    expect(summary.trend).toEqual([
      { key: "2026-09", label: "September 2026", revenue: 12_000_000, grossProfit: 2_000_000 },
      { key: "2026-10", label: "Oktober 2026", revenue: 0, grossProfit: 0 },
      { key: "2026-11", label: "November 2026", revenue: 20_000_000, grossProfit: 5_000_000 },
    ]);
  });

  it("buckets This month weekly in 7-day WIB windows and zero-fills empty weeks", () => {
    const units: SalesUnit[] = [
      unit({ id: 1, dateSold: new Date("2026-11-02T00:00:00.000Z") }),
      unit({ id: 2, dateSold: new Date("2026-11-10T00:00:00.000Z") }),
    ];

    const summary = computeSalesSummary(units, period("this-month"));

    expect(summary.trend).toEqual([
      { key: "2026-11-01", label: "1–7 Nov", revenue: 12_000_000, grossProfit: 2_000_000 },
      { key: "2026-11-08", label: "8–14 Nov", revenue: 12_000_000, grossProfit: 2_000_000 },
      { key: "2026-11-15", label: "15–21 Nov", revenue: 0, grossProfit: 0 },
      { key: "2026-11-22", label: "22–28 Nov", revenue: 0, grossProfit: 0 },
      { key: "2026-11-29", label: "29–30 Nov", revenue: 0, grossProfit: 0 },
    ]);
  });

  it("buckets Last month weekly too, even though it spans 31 days", () => {
    const summary = computeSalesSummary([], period("last-month"));

    expect(summary.trend.map((point) => point.label)).toEqual([
      "1–7 Okt",
      "8–14 Okt",
      "15–21 Okt",
      "22–28 Okt",
      "29–31 Okt",
    ]);
  });

  it("labels a weekly bucket that crosses a month boundary with both months", () => {
    const summary = computeSalesSummary([], resolvePeriod("custom", NOW, {
      from: "2026-09-28",
      to: "2026-10-10",
    }));

    expect(summary.trend.map((point) => point.label)).toEqual([
      "28 Sep–4 Okt",
      "5–10 Okt",
    ]);
  });

  it("switches from weekly to monthly at the 31-day boundary", () => {
    const weekly = computeSalesSummary([], resolvePeriod("custom", NOW, {
      from: "2026-10-01",
      to: "2026-10-31",
    }));
    const monthly = computeSalesSummary([], resolvePeriod("custom", NOW, {
      from: "2026-10-01",
      to: "2026-11-01",
    }));

    expect(weekly.trend.map((point) => point.key)).toEqual([
      "2026-10-01",
      "2026-10-08",
      "2026-10-15",
      "2026-10-22",
      "2026-10-29",
    ]);
    expect(monthly.trend.map((point) => point.key)).toEqual(["2026-10", "2026-11"]);
  });

  it("surfaces loss-making sales (Gross Profit below zero), worst first", () => {
    const units: SalesUnit[] = [
      unit({ id: 1, brand: "HONDA", model: "SCOOPY PRESTIGE", buyPrice: 18_350_000, cost: 0, sellPrice: 15_000_000 }),
      unit({ id: 2, brand: "YAMAHA", model: "NMAX", buyPrice: 20_000_000, sellPrice: 30_000_000 }),
    ];

    const summary = computeSalesSummary(units, period("this-month"));

    expect(summary.losses).toEqual([
      { id: 1, brand: "HONDA", model: "SCOOPY PRESTIGE", sellPrice: 15_000_000, grossProfit: -3_350_000 },
    ]);
  });
});
