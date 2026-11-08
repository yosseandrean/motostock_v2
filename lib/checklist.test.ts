import { describe, expect, it } from "vitest";
import { computeChecklist } from "@/lib/checklist";
import type { ChecklistUnit } from "@/lib/checklist";

function unit(overrides: Partial<ChecklistUnit> = {}): ChecklistUnit {
  return {
    id: 1,
    brand: "HONDA",
    model: "BEAT",
    licensePlate: "B 1 AAA",
    color: "MERAH",
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

    const categories = computeChecklist(units);

    expect(itemIds(categories, "empty-chassis")).toEqual([1, 2]);
  });

  it("flags Chassis Serial Numbers shared by several Units", () => {
    const units = [
      unit({ id: 1, chassisSerialNumber: "MH1DUP" }),
      unit({ id: 2, chassisSerialNumber: "MH1DUP" }),
      unit({ id: 3, chassisSerialNumber: "MH1SOLO" }),
      unit({ id: 4, chassisSerialNumber: null }),
    ];

    const category = computeChecklist(units).find(
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

    const category = computeChecklist(units).find(
      (candidate) => candidate.key === "duplicate-license-plate",
    );

    expect(category?.items.map((item) => item.id)).toEqual([1, 2]);
    expect(category?.items[0].detail).toBe("B 4529 UCB");
  });

  it("flags Units missing Color or Name on Registration", () => {
    const units = [
      unit({ id: 1, color: "" }),
      unit({ id: 2, color: "HITAM" }),
      unit({ id: 3, nameOnRegistration: null }),
      unit({ id: 4, nameOnRegistration: "BUDI" }),
    ];

    const categories = computeChecklist(units);

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

    const category = computeChecklist(units).find(
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

    const categories = computeChecklist(units);

    expect(
      categories.find((candidate) => candidate.key === "case-split-sales-person"),
    ).toBeUndefined();
  });

  it("can place one Unit in several categories", () => {
    const units = [
      unit({
        id: 1,
        chassisSerialNumber: null,
        color: "",
        nameOnRegistration: null,
      }),
    ];

    const categories = computeChecklist(units);

    const keys = categories.map((category) => category.key);
    expect(keys).toContain("empty-chassis");
    expect(keys).toContain("missing-color");
    expect(keys).toContain("missing-name-on-registration");
  });

  it("omits categories with no affected Units", () => {
    const categories = computeChecklist([unit()]);

    expect(categories).toEqual([]);
  });
});
