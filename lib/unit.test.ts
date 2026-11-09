import { describe, expect, it } from "vitest";
import {
  filterUnits,
  grossProfit,
  invested,
  isSold,
  parseUnitStatus,
  statusLabel,
} from "@/lib/unit";
import type { UnitLike } from "@/lib/unit";

const base: UnitLike = {
  brand: "HONDA",
  model: "BEAT",
  modelYear: "2023",
  licensePlate: "B 1 AAA",
  chassisSerialNumber: "MH1ABC123",
  salesPerson: "ANNA",
  buyPrice: 10_000_000,
  cost: 500_000,
  sellPrice: null,
};

describe("invested", () => {
  it("is Buy Price plus Cost", () => {
    expect(invested(base)).toBe(10_500_000);
  });
});

describe("grossProfit", () => {
  it("is Sell Price minus Invested for a Sold Unit", () => {
    expect(grossProfit({ ...base, sellPrice: 12_000_000 })).toBe(1_500_000);
  });

  it("is null for an In Stock Unit", () => {
    expect(grossProfit(base)).toBeNull();
  });
});

describe("isSold", () => {
  it("is true only when a Sell Price is present", () => {
    expect(isSold(base)).toBe(false);
    expect(isSold({ ...base, sellPrice: 12_000_000 })).toBe(true);
  });
});

describe("statusLabel", () => {
  it("derives In Stock from an empty Sell Price", () => {
    expect(statusLabel(base)).toBe("Stok");
  });

  it("derives Sold from a present Sell Price", () => {
    const sold = { ...base, sellPrice: 12_000_000 };
    expect(statusLabel(sold)).toBe("Terjual");
  });
});

describe("parseUnitStatus", () => {
  it("accepts the two canonical status values", () => {
    expect(parseUnitStatus("stok")).toBe("stok");
    expect(parseUnitStatus("terjual")).toBe("terjual");
  });

  it("rejects unknown or missing values", () => {
    expect(parseUnitStatus(undefined)).toBeUndefined();
    expect(parseUnitStatus("")).toBeUndefined();
    expect(parseUnitStatus("sold")).toBeUndefined();
  });
});

describe("filterUnits", () => {
  const units: UnitLike[] = [
    base,
    { ...base, licensePlate: "B 2 BBB", chassisSerialNumber: "MH1XYZ999", salesPerson: "BUDI" },
    { ...base, sellPrice: 12_000_000, brand: "YAMAHA", model: "NMAX" },
  ];

  it("returns everything with no filter", () => {
    expect(filterUnits(units, {})).toHaveLength(3);
  });

  it("matches Brand, Model, License Plate, Chassis Serial Number and Sales Person", () => {
    expect(filterUnits(units, { query: "yamaha" })).toHaveLength(1);
    expect(filterUnits(units, { query: "nmax" })).toHaveLength(1);
    expect(filterUnits(units, { query: "b 2 bbb" })).toHaveLength(1);
    expect(filterUnits(units, { query: "mh1xyz999" })).toHaveLength(1);
    expect(filterUnits(units, { query: "budi" })).toHaveLength(1);
  });

  it("matches case-insensitively", () => {
    expect(filterUnits(units, { query: "HONDA" })).toHaveLength(2);
    expect(filterUnits(units, { query: "honda" })).toHaveLength(2);
  });

  it("filters by Status", () => {
    expect(filterUnits(units, { status: "stok" })).toHaveLength(2);
    expect(filterUnits(units, { status: "terjual" })).toHaveLength(1);
  });

  it("combines query and Status", () => {
    expect(filterUnits(units, { query: "honda", status: "terjual" })).toHaveLength(0);
    expect(filterUnits(units, { query: "yamaha", status: "terjual" })).toHaveLength(1);
  });
});
