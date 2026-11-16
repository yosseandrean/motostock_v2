import { describe, expect, it } from "vitest";
import {
  CSV_HEADERS,
  parseImportRow,
  parseUnitForm,
  readUnitForm,
  UNIT_FIELDS,
  unitRecordToCsvRow,
  unitRecordToFormValues,
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

describe("readUnitForm", () => {
  it("reads every field key out of the submitted FormData", () => {
    const formData = new FormData();
    for (const field of UNIT_FIELDS) {
      formData.set(field.key, field.key.toUpperCase());
    }

    const values = readUnitForm(formData);

    expect(Object.keys(values)).toEqual(UNIT_FIELDS.map((field) => field.key));
    expect(values.brand).toBe("BRAND");
    expect(values.notes).toBe("NOTES");
  });

  it("reads an absent field as an empty string", () => {
    expect(readUnitForm(new FormData()).licensePlate).toBe("");
  });
});

describe("unitRecordToFormValues", () => {
  it("serializes a record to raw form strings, nulls as empty strings", () => {
    const values = unitRecordToFormValues(sampleRecord);

    expect(values.brand).toBe("HONDA");
    expect(values.buyPrice).toBe("10000000");
    expect(values.sellPrice).toBe("");
    expect(values.dateBought).toBe("2026-01-01");
    expect(values.dateSold).toBe("");
    expect(values.chassisSerialNumber).toBe("MH1ABC123");
  });
});

describe("parseUnitForm", () => {
  const minimalForm = {
    brand: "HONDA",
    model: "BEAT",
    modelYear: "2023",
    licensePlate: "B 1 AAA",
    color: "",
    buyPrice: "10000000",
    cost: "",
    sellPrice: "",
    dateBought: "2026-01-01",
    dateSold: "",
    salesPerson: "",
    nameOnRegistration: "",
    chassisSerialNumber: "",
    engineSerialNumber: "",
    boughtFrom: "",
    notes: "",
  };

  it("parses the minimal In Stock form into the canonical record", () => {
    const result = parseUnitForm(minimalForm);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        brand: "HONDA",
        model: "BEAT",
        modelYear: "2023",
        licensePlate: "B 1 AAA",
        color: "",
        buyPrice: 10_000_000,
        cost: 0,
        sellPrice: null,
        dateBought: new Date("2026-01-01T00:00:00.000Z"),
        dateSold: null,
        salesPerson: null,
        nameOnRegistration: null,
        chassisSerialNumber: null,
        engineSerialNumber: null,
        boughtFrom: null,
        notes: null,
      });
    }
  });

  it("uppercases Brand, Model, Color and Sales Person", () => {
    const result = parseUnitForm({
      ...minimalForm,
      brand: " honda ",
      model: " beat  deluxe ",
      color: " merah ",
      salesPerson: " hasan ",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.brand).toBe("HONDA");
      expect(result.data.model).toBe("BEAT DELUXE");
      expect(result.data.color).toBe("MERAH");
      expect(result.data.salesPerson).toBe("HASAN");
    }
  });

  it("rejects missing required fields with Indonesian labels", () => {
    const result = parseUnitForm({
      ...minimalForm,
      brand: "",
      model: "",
      licensePlate: "",
      buyPrice: "",
      dateBought: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.brand).toBe("Merek wajib diisi");
      expect(result.errors.model).toBe("Model wajib diisi");
      expect(result.errors.licensePlate).toBe("Plat wajib diisi");
      expect(result.errors.buyPrice).toBe("Harga Beli wajib diisi");
      expect(result.errors.dateBought).toBe("Tanggal Beli wajib diisi");
    }
  });

  it("rejects invalid integers, dates and Model Year", () => {
    const result = parseUnitForm({
      ...minimalForm,
      buyPrice: "sepuluh juta",
      dateBought: "01/01/2026",
      modelYear: "abc",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.buyPrice).toBe("Harga Beli harus angka");
      expect(result.errors.dateBought).toBe("Tanggal Beli tidak valid");
      expect(result.errors.modelYear).toBe("Tahun tidak valid");
    }
  });

  it("keeps Sell Price and Date Sold as a pair", () => {
    const sellOnly = parseUnitForm({ ...minimalForm, sellPrice: "12500000" });
    expect(sellOnly.ok).toBe(false);
    if (!sellOnly.ok) {
      expect(sellOnly.errors.dateSold).toBe(
        "Tanggal Jual wajib diisi bersama Harga Jual"
      );
    }

    const dateOnly = parseUnitForm({ ...minimalForm, dateSold: "2026-03-01" });
    expect(dateOnly.ok).toBe(false);
    if (!dateOnly.ok) {
      expect(dateOnly.errors.sellPrice).toBe(
        "Harga Jual wajib diisi bersama Tanggal Jual"
      );
    }
  });
});
