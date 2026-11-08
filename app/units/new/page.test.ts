import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
type SearchParams = { errors?: string; values?: string };
let NewUnitPage: (props: { searchParams: Promise<SearchParams> }) => Promise<ReactElement>;

async function renderPage(params: SearchParams = {}): Promise<string> {
  const element = await NewUnitPage({ searchParams: Promise.resolve(params) });
  return renderToString(element);
}

async function seedUnit(overrides: Record<string, unknown> = {}) {
  return prisma.unit.create({
    data: {
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
      ...overrides,
    },
  });
}

beforeAll(async () => {
  prisma = await createTestDb();
  NewUnitPage = (await import("@/app/units/new/page")).default;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.unit.deleteMany();
});

describe("new unit page", () => {
  it("renders a form with all 16 fields", async () => {
    const html = await renderPage();

    expect(html).toContain('action="/api/units"');
    expect(html).toContain('method="post"');
    for (const label of [
      "Merek",
      "Model",
      "Tahun",
      "Plat",
      "Warna",
      "Harga Beli",
      "Biaya",
      "Harga Jual",
      "Tanggal Beli",
      "Tanggal Jual",
      "Sales Person",
      "Nama di STNK",
      "Nomor Rangka",
      "Nomor Mesin",
      "Dibeli Dari",
      "Catatan",
    ]) {
      expect(html).toContain(label);
    }
    for (const name of [
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
    ]) {
      expect(html).toContain(`name="${name}"`);
    }
  });

  it("offers Brand, Color and Sales Person catalogs and Bought From suggestions", async () => {
    await seedUnit({ brand: "HONDA", model: "BEAT", color: "MERAH", salesPerson: "HASAN", boughtFrom: "JBA TIPAR" });
    await seedUnit({ brand: "HONDA", model: "PCX 160", color: "HITAM", salesPerson: "BUDI", boughtFrom: "OTOLINK", licensePlate: "B 2 BBB" });
    await seedUnit({ brand: "YAMAHA", model: "NMAX", color: "MERAH", salesPerson: "HASAN", boughtFrom: "JBA TIPAR", licensePlate: "B 3 CCC" });

    const html = await renderPage();

    expect(html).toContain('<option value="HONDA">HONDA</option>');
    expect(html).toContain('<option value="YAMAHA">YAMAHA</option>');
    expect(html).toContain('<option value="MERAH">MERAH</option>');
    expect(html).toContain('<option value="HITAM">HITAM</option>');
    expect(html).toContain('<option value="HASAN">HASAN</option>');
    expect(html).toContain('<option value="BUDI">BUDI</option>');
    expect(html).toContain('<option value="JBA TIPAR">');
    expect(html).toContain('<option value="OTOLINK">');
  });

  it("filters Model options by the selected Brand", async () => {
    await seedUnit({ brand: "HONDA", model: "BEAT" });
    await seedUnit({ brand: "HONDA", model: "PCX 160", licensePlate: "B 2 BBB" });
    await seedUnit({ brand: "YAMAHA", model: "NMAX", licensePlate: "B 3 CCC" });

    const html = await renderPage({
      values: JSON.stringify({ brand: "HONDA", model: "BEAT" }),
    });

    expect(html).toContain('data-brand="HONDA"');
    expect(html).toContain('value="BEAT"');
    expect(html).toContain('value="PCX 160"');
    expect(html).not.toContain("NMAX");
  });

  it("shows field errors passed in the URL", async () => {
    const html = await renderPage({
      errors: JSON.stringify({
        brand: "Merek wajib diisi",
        modelYear: "Tahun tidak valid",
        dateSold: "Tanggal Jual wajib diisi bersama Harga Jual",
      }),
    });

    expect(html).toContain("Merek wajib diisi");
    expect(html).toContain("Tahun tidak valid");
    expect(html).toContain("Tanggal Jual wajib diisi bersama Harga Jual");
  });

  it("preserves submitted values in the form", async () => {
    const html = await renderPage({
      values: JSON.stringify({ brand: "HONDA", licensePlate: "B 9 CCC", notes: "BELI KEMBALI" }),
    });

    expect(html).toContain('value="B 9 CCC"');
    expect(html).toContain("BELI KEMBALI");
  });
});
