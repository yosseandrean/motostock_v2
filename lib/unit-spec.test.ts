import { describe, expect, it } from "vitest";
import {
  CSV_HEADERS,
  parseImportRow,
  UNIT_FIELDS,
  unitRecordToCsvRow,
} from "@/lib/unit-spec";
import type { UnitRecord } from "@/lib/unit-spec";

const sampleRecord: UnitRecord = {
  brand: "HONDA",
  model: "BEAT",
  modelYear: "2023",
  licensePlate: "B 1 AAA",
  color: "MERAH",
  buyPrice: 10_000_000,
  cost: 0,
  sellPrice: null,
  dateBought: new Date("2026-01-01T00:00:00.000Z"),
  dateSold: null,
  salesPerson: null,
  nameOnRegistration: null,
  chassisSerialNumber: "MH1ABC123",
  engineSerialNumber: null,
  boughtFrom: null,
  notes: null,
};

const fullRawRow = [
  "HONDA",
  "BEAT",
  "2023",
  "B 1 AAA",
  "MERAH",
  "10000000",
  "0",
  "",
  "2026-01-01",
  "",
  "",
  "",
  "MH1ABC123",
  "",
  "",
  "",
];

describe("UNIT_FIELDS", () => {
  it("has exactly 16 entries in CSV column order", () => {
    expect(UNIT_FIELDS).toHaveLength(16);
    expect(UNIT_FIELDS.map((field) => field.key)).toEqual([
      "brand",
      "model",
      "modelYear",
      "licensePlate",
      "color",
      "buyPrice",
      "cost",
      "sellPrice",
      "dateBought",
      "dateSold",
      "salesPerson",
      "nameOnRegistration",
      "chassisSerialNumber",
      "engineSerialNumber",
      "boughtFrom",
      "notes",
    ]);
  });

  it("pairs each key with its CSV header and user-facing label", () => {
    expect(UNIT_FIELDS[0]).toMatchObject({
      key: "brand",
      csvHeader: "Brand",
      label: "Merek",
    });
    expect(UNIT_FIELDS[2]).toMatchObject({
      key: "modelYear",
      csvHeader: "Year",
      label: "Tahun",
    });
    expect(UNIT_FIELDS[8]).toMatchObject({
      key: "dateBought",
      csvHeader: "Date Bought",
      label: "Tanggal Beli",
    });
  });
});

describe("CSV_HEADERS", () => {
  it("is the 16 headers in order, derived from the field spec", () => {
    expect(CSV_HEADERS).toEqual([
      "Brand",
      "Model",
      "Year",
      "License Plate",
      "Color",
      "Buy Price",
      "Cost",
      "Sell Price",
      "Date Bought",
      "Date Sold",
      "Sales Person",
      "Name on Registration",
      "Chassis Serial Number",
      "Engine Serial Number",
      "Bought From",
      "Notes",
    ]);
  });
});

describe("unitRecordToCsvRow", () => {
  it("serializes a record to 16 columns, nulls and dates as the CSV expects", () => {
    expect(unitRecordToCsvRow(sampleRecord)).toEqual(fullRawRow);
  });

  it("renders present optional fields and formats dates as YYYY-MM-DD", () => {
    const row = unitRecordToCsvRow({
      ...sampleRecord,
      sellPrice: 12_000_000,
      dateSold: new Date("2026-02-01T00:00:00.000Z"),
      salesPerson: "HASAN",
    });
    expect(row[7]).toBe("12000000");
    expect(row[9]).toBe("2026-02-01");
    expect(row[10]).toBe("HASAN");
  });
});

describe("parseImportRow", () => {
  it("parses a full raw row into the canonical record", () => {
    const result = parseImportRow(fullRawRow);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(sampleRecord);
    }
  });

  it("round-trips record → row → record", () => {
    const complete: UnitRecord = {
      ...sampleRecord,
      sellPrice: 12_000_000,
      dateSold: new Date("2026-02-01T00:00:00.000Z"),
      salesPerson: "HASAN",
      nameOnRegistration: "AGUSTINA",
      engineSerialNumber: "JM91E-1961071",
      boughtFrom: "JBA TIPAR",
      notes: "TA",
    };
    const parsed = parseImportRow(unitRecordToCsvRow(complete));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data).toEqual(complete);
    }
  });

  it("rejects the wrong number of columns", () => {
    expect(parseImportRow(["HONDA"])).toEqual({
      ok: false,
      reason: "expected 16 columns, got 1",
    });
  });

  it("uppercases Brand, Model, Color and Sales Person and collapses whitespace", () => {
    const result = parseImportRow([
      "  honda ",
      "beat  deluxe ",
      "2023",
      "B 1 AAA",
      " merah ",
      "10000000",
      "0",
      "",
      "2026-01-01",
      "",
      " hasan ",
      "",
      "MH1ABC123",
      "",
      "",
      "",
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.brand).toBe("HONDA");
      expect(result.data.model).toBe("BEAT DELUXE");
      expect(result.data.color).toBe("MERAH");
      expect(result.data.salesPerson).toBe("HASAN");
    }
  });

  it("allows an empty Color and defaults empty Cost to 0", () => {
    const result = parseImportRow([
      "HONDA",
      "BEAT",
      "2023",
      "B 1 AAA",
      "",
      "10000000",
      "",
      "",
      "2026-01-01",
      "",
      "",
      "",
      "MH1ABC123",
      "",
      "",
      "",
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.color).toBe("");
      expect(result.data.cost).toBe(0);
    }
  });

  it("rejects missing required fields with the canonical English name", () => {
    expect(
      parseImportRow([
        "",
        "BEAT",
        "2023",
        "B 1 AAA",
        "",
        "10000000",
        "0",
        "",
        "2026-01-01",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
    ).toEqual({ ok: false, reason: "missing Brand" });
    expect(
      parseImportRow([
        "HONDA",
        "",
        "2023",
        "B 1 AAA",
        "",
        "10000000",
        "0",
        "",
        "2026-01-01",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
    ).toEqual({ ok: false, reason: "missing Model" });
    expect(
      parseImportRow([
        "HONDA",
        "BEAT",
        "",
        "B 1 AAA",
        "",
        "10000000",
        "0",
        "",
        "2026-01-01",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
    ).toEqual({ ok: false, reason: "missing Model Year" });
    expect(
      parseImportRow([
        "HONDA",
        "BEAT",
        "2023",
        "",
        "",
        "10000000",
        "0",
        "",
        "2026-01-01",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
    ).toEqual({ ok: false, reason: "missing License Plate" });
    expect(
      parseImportRow([
        "HONDA",
        "BEAT",
        "2023",
        "B 1 AAA",
        "",
        "",
        "0",
        "",
        "2026-01-01",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
    ).toEqual({ ok: false, reason: "missing Buy Price" });
    expect(
      parseImportRow([
        "HONDA",
        "BEAT",
        "2023",
        "B 1 AAA",
        "",
        "10000000",
        "0",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
    ).toEqual({ ok: false, reason: "missing Date Bought" });
  });

  it("rejects invalid integers and dates", () => {
    expect(
      parseImportRow([
        "HONDA",
        "BEAT",
        "2023",
        "B 1 AAA",
        "",
        "abc",
        "0",
        "",
        "2026-01-01",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
    ).toEqual({ ok: false, reason: "invalid Buy Price" });
    expect(
      parseImportRow([
        "HONDA",
        "BEAT",
        "2023",
        "B 1 AAA",
        "",
        "10000000",
        "x",
        "",
        "2026-01-01",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
    ).toEqual({ ok: false, reason: "invalid Cost" });
    expect(
      parseImportRow([
        "HONDA",
        "BEAT",
        "2023",
        "B 1 AAA",
        "",
        "10000000",
        "0",
        "x",
        "2026-01-01",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
    ).toEqual({ ok: false, reason: "invalid Sell Price" });
    expect(
      parseImportRow([
        "HONDA",
        "BEAT",
        "2023",
        "B 1 AAA",
        "",
        "10000000",
        "0",
        "",
        "2026-02-30",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
    ).toEqual({ ok: false, reason: "invalid Date Bought" });
    expect(
      parseImportRow([
        "HONDA",
        "BEAT",
        "2023",
        "B 1 AAA",
        "",
        "10000000",
        "0",
        "",
        "2026-01-01",
        "not-a-date",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
    ).toEqual({ ok: false, reason: "invalid Date Sold" });
  });
});
