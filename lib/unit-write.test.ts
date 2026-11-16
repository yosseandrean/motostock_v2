import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { UnitFormValues } from "@/lib/unit-spec";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
let createUnit: typeof import("@/lib/unit-write").createUnit;
let updateUnit: typeof import("@/lib/unit-write").updateUnit;
let sellUnit: typeof import("@/lib/unit-write").sellUnit;
let deleteUnit: typeof import("@/lib/unit-write").deleteUnit;

const VALID_UNIT_FORM: UnitFormValues = {
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

beforeAll(async () => {
  prisma = await createTestDb();
  ({ createUnit, updateUnit, sellUnit, deleteUnit } =
    await import("@/lib/unit-write"));
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.unit.deleteMany();
});

async function createSeededUnit(
  values: UnitFormValues = VALID_UNIT_FORM
): Promise<number> {
  const result = await createUnit(values);
  if (result.status !== "created") {
    throw new Error("Expected the seed Unit to be created");
  }
  return result.id;
}

describe("createUnit", () => {
  it("creates a Unit and returns a created result", async () => {
    const result = await createUnit(VALID_UNIT_FORM);

    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.id).toBeGreaterThan(0);
      expect(result.warnings).toEqual([]);
    }
  });

  it("returns field errors without creating an invalid Unit", async () => {
    const result = await createUnit({
      ...VALID_UNIT_FORM,
      brand: "",
      buyPrice: "sepuluh juta",
    });

    expect(result.status).toBe("validation-error");
    if (result.status === "validation-error") {
      expect(result.errors).toMatchObject({
        brand: "Merek wajib diisi",
        buyPrice: "Harga Beli harus angka",
      });
    }
    expect(await prisma.unit.count()).toBe(0);
  });

  it("warns about duplicate Unit identity but still creates the Unit", async () => {
    await createSeededUnit({
      ...VALID_UNIT_FORM,
      chassisSerialNumber: "MH1ABC123",
    });

    const result = await createUnit({
      ...VALID_UNIT_FORM,
      chassisSerialNumber: "MH1ABC123",
    });

    expect(result).toMatchObject({
      status: "created",
      warnings: ["chassis", "license"],
    });
    expect(await prisma.unit.count()).toBe(2);
  });
});

describe("updateUnit", () => {
  it("updates an existing Unit without warning about its own identity", async () => {
    const id = await createSeededUnit({
      ...VALID_UNIT_FORM,
      chassisSerialNumber: "MH1ABC123",
    });

    const result = await updateUnit(id, {
      ...VALID_UNIT_FORM,
      brand: "YAMAHA",
      chassisSerialNumber: "MH1ABC123",
    });

    expect(result).toEqual({ status: "updated", id, warnings: [] });
    expect((await prisma.unit.findUnique({ where: { id } }))?.brand).toBe(
      "YAMAHA"
    );
  });

  it("shares the duplicate-identity warning with create", async () => {
    await createSeededUnit({
      ...VALID_UNIT_FORM,
      chassisSerialNumber: "MH1ABC123",
    });
    const id = await createSeededUnit({
      ...VALID_UNIT_FORM,
      licensePlate: "B 2 BBB",
      chassisSerialNumber: "MH1XYZ999",
    });

    const result = await updateUnit(id, {
      ...VALID_UNIT_FORM,
      chassisSerialNumber: "MH1ABC123",
    });

    expect(result).toEqual({
      status: "updated",
      id,
      warnings: ["chassis", "license"],
    });
  });
});

describe("sellUnit", () => {
  it("marks an existing Unit Sold and returns a sold result", async () => {
    const id = await createSeededUnit();

    const result = await sellUnit(id, {
      sellPrice: "12500000",
      dateSold: "2026-03-01",
      salesPerson: "budi",
    });

    expect(result).toEqual({ status: "sold", id });
    const stored = await prisma.unit.findUnique({ where: { id } });
    expect(stored?.sellPrice).toBe(12_500_000);
    expect(stored?.dateSold?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(stored?.salesPerson).toBe("BUDI");
  });

  it("returns sell-form errors without marking the Unit Sold", async () => {
    const id = await createSeededUnit();

    const result = await sellUnit(id, {
      sellPrice: "",
      dateSold: "01/03/2026",
      salesPerson: "BUDI",
    });

    expect(result.status).toBe("validation-error");
    if (result.status === "validation-error") {
      expect(result.errors).toMatchObject({
        sellPrice: "Harga Jual wajib diisi",
        dateSold: "Tanggal Jual tidak valid",
      });
    }
    expect(
      (await prisma.unit.findUnique({ where: { id } }))?.sellPrice
    ).toBeNull();
  });
});

describe("deleteUnit", () => {
  it("deletes an existing Unit and returns a deleted result", async () => {
    const id = await createSeededUnit();

    const result = await deleteUnit(id);

    expect(result).toEqual({ status: "deleted", id });
    expect(await prisma.unit.count()).toBe(0);
  });
});

describe("missing Units", () => {
  it("returns not-found for update, sell, and delete", async () => {
    expect(await updateUnit(999, VALID_UNIT_FORM)).toEqual({
      status: "not-found",
    });
    expect(
      await sellUnit(999, {
        sellPrice: "12500000",
        dateSold: "2026-03-01",
        salesPerson: "BUDI",
      })
    ).toEqual({ status: "not-found" });
    expect(await deleteUnit(999)).toEqual({ status: "not-found" });
  });
});
