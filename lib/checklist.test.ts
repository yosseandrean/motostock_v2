import { describe, expect, it } from "vitest";
import { computeChecklist } from "@/lib/checklist";
import type { ChecklistUnit } from "@/lib/checklist";

const NOW = new Date("2026-11-08T00:00:00.000Z");

/** A Date Bought exactly `daysAgo` calendar days before NOW. */
function bought(daysAgo: number): Date {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date;
}

function unit(overrides: Partial<ChecklistUnit> = {}): ChecklistUnit {
  return {
    id: 1,
    brand: "HONDA",
    model: "BEAT",
    licensePlate: "B 1 AAA",
    color: "MERAH",
    buyPrice: 10_000_000,
    cost: 0,
    sellPrice: null,
    dateBought: bought(0),
    salesPerson: null,
    nameOnRegistration: "ANNA",
    chassisSerialNumber: "MH1ABC123",
    ...overrides,
  };
}

function itemIds(categories: ReturnType<typeof computeChecklist>, key: string) {
  return categories
    .find((category) => category.key === key)
    ?.items.map((item) => item.id);
}

describe("computeChecklist", () => {
  it("flags Units with an empty Chassis Serial Number", () => {
    const units = [
      unit({ id: 1, chassisSerialNumber: null }),
      unit({ id: 2, chassisSerialNumber: "  " }),
      unit({ id: 3, chassisSerialNumber: "MH1XYZ" }),
    ];

    const categories = computeChecklist(units, NOW);

    expect(itemIds(categories, "empty-chassis")).toEqual([1, 2]);
  });

  it("flags Chassis Serial Numbers shared by several Units", () => {
    const units = [
      unit({ id: 1, chassisSerialNumber: "MH1DUP" }),
      unit({ id: 2, chassisSerialNumber: "MH1DUP" }),
      unit({ id: 3, chassisSerialNumber: "MH1SOLO" }),
      unit({ id: 4, chassisSerialNumber: null }),
    ];

    const category = computeChecklist(units, NOW).find(
      (candidate) => candidate.key === "duplicate-chassis",
    );

    expect(category?.items.map((item) => item.id)).toEqual([1, 2]);
    expect(category?.items[0].detail).toBe("MH1DUP");
  });

  it("flags License Plates shared by several Units", () => {
    const units = [
      unit({ id: 1, licensePlate: "B 4529 UCB" }),
      unit({ id: 2, licensePlate: "B 4529 UCB" }),
      unit({ id: 3, licensePlate: "B 1 AAA" }),
    ];

    const category = computeChecklist(units, NOW).find(
      (candidate) => candidate.key === "duplicate-license-plate",
    );

    expect(category?.items.map((item) => item.id)).toEqual([1, 2]);
    expect(category?.items[0].detail).toBe("B 4529 UCB");
  });

  it("flags Sold Units missing a Sales Person, but not In Stock Units", () => {
    const units = [
      unit({ id: 1, sellPrice: 12_000_000, salesPerson: null }),
      unit({ id: 2, sellPrice: 13_000_000, salesPerson: "  " }),
      unit({ id: 3, sellPrice: 14_000_000, salesPerson: "HASAN" }),
      unit({ id: 4, sellPrice: null, salesPerson: null }),
    ];

    expect(itemIds(computeChecklist(units, NOW), "missing-sales-person")).toEqual([
      1, 2,
    ]);
  });

  it("flags Units missing Color or Name on Registration", () => {
    const units = [
      unit({ id: 1, color: "" }),
      unit({ id: 2, color: "HITAM" }),
      unit({ id: 3, nameOnRegistration: null }),
      unit({ id: 4, nameOnRegistration: "BUDI" }),
    ];

    const categories = computeChecklist(units, NOW);

    expect(itemIds(categories, "missing-color")).toEqual([1]);
    expect(itemIds(categories, "missing-name-on-registration")).toEqual([3]);
  });

  it("flags Sales Person values that differ only by case", () => {
    const units = [
      unit({ id: 1, salesPerson: "HASAN" }),
      unit({ id: 2, salesPerson: "hasan" }),
      unit({ id: 3, salesPerson: "Hasan" }),
      unit({ id: 4, salesPerson: "HASAN" }),
      unit({ id: 5, salesPerson: "HELMI" }),
    ];

    const category = computeChecklist(units, NOW).find(
      (candidate) => candidate.key === "case-split-sales-person",
    );

    expect(category?.items.map((item) => item.id)).toEqual([1, 2, 3, 4]);
    expect(category?.items.map((item) => item.detail)).toEqual([
      "HASAN",
      "hasan",
      "Hasan",
      "HASAN",
    ]);
  });

  it("does not flag distinct Sales Persons that merely share letters", () => {
    const units = [
      unit({ id: 1, salesPerson: "HELMI" }),
      unit({ id: 2, salesPerson: "HELMY" }),
    ];

    const categories = computeChecklist(units, NOW);

    expect(
      categories.find((candidate) => candidate.key === "case-split-sales-person"),
    ).toBeUndefined();
  });

  it("flags loss-making sales (Gross Profit below zero)", () => {
    const units = [
      unit({ id: 1, buyPrice: 18_350_000, cost: 0, sellPrice: 15_000_000 }),
      unit({ id: 2, buyPrice: 10_000_000, cost: 0, sellPrice: 12_000_000 }),
      unit({ id: 3, buyPrice: 10_000_000, cost: 0, sellPrice: 10_000_000 }),
    ];

    const category = computeChecklist(units, NOW).find(
      (candidate) => candidate.key === "loss-making-sales",
    );

    expect(category?.items.map((item) => item.id)).toEqual([1]);
    expect(category?.items[0].detail).toBe("-Rp\u00a03.350.000");
  });

  it("flags Stale In Stock Units (Age over 90 days), oldest first", () => {
    const units = [
      unit({ id: 1, dateBought: bought(91) }),
      unit({ id: 2, dateBought: bought(90) }),
      unit({ id: 3, dateBought: bought(120) }),
      unit({ id: 4, dateBought: bought(120), sellPrice: 12_000_000 }),
    ];

    const category = computeChecklist(units, NOW).find(
      (candidate) => candidate.key === "stale-units",
    );

    expect(category?.items.map((item) => item.id)).toEqual([3, 1]);
    expect(category?.items.map((item) => item.detail)).toEqual([
      "120 hari",
      "91 hari",
    ]);
  });

  it("can place one Unit in several categories", () => {
    const units = [
      unit({
        id: 1,
        chassisSerialNumber: null,
        color: "",
        salesPerson: null,
        sellPrice: 12_000_000,
      }),
    ];

    const categories = computeChecklist(units, NOW);

    const keys = categories.map((category) => category.key);
    expect(keys).toContain("empty-chassis");
    expect(keys).toContain("missing-color");
    expect(keys).toContain("missing-sales-person");
  });

  it("omits categories with no affected Units", () => {
    const categories = computeChecklist([unit()], NOW);

    expect(categories).toEqual([]);
  });
});
