import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
type Params = { id: string };
type SearchParams = { errors?: string; values?: string; warning?: string };
let EditUnitPage: (props: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) => Promise<ReactElement>;

async function renderPage(
  id: string | number,
  searchParams: SearchParams = {},
): Promise<string> {
  const element = await EditUnitPage({
    params: Promise.resolve({ id: String(id) }),
    searchParams: Promise.resolve(searchParams),
  });
  return renderToString(element);
}

async function seedUnit(overrides: Record<string, unknown> = {}) {
  return prisma.unit.create({
    data: {
      brand: "HONDA",
      model: "PCX 160",
      modelYear: "2025",
      licensePlate: "B 9 CCC",
      color: "MERAH",
      buyPrice: 28_000_000,
      cost: 200_000,
      sellPrice: 30_000_000,
      dateBought: new Date("2026-01-02T12:00:00.000Z"),
      dateSold: new Date("2026-02-03T12:00:00.000Z"),
      salesPerson: "ANNA",
      nameOnRegistration: "BONG, ANTON",
      chassisSerialNumber: "MH1KFE116SK-296462",
      engineSerialNumber: "KFE1E-1296587",
      boughtFrom: "JBA TIPAR",
      notes: "BELI KEMBALI",
      ...overrides,
    },
  });
}

beforeAll(async () => {
  prisma = await createTestDb();
  EditUnitPage = (await import("@/app/units/[id]/edit/page")).default;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.unit.deleteMany();
});

describe("edit unit page", () => {
  it("renders Brand, Model, Color and Sales Person as free-text inputs with historical suggestions", async () => {
    const unit = await seedUnit();
    await seedUnit({ brand: "YAMAHA", model: "NMAX", color: "HITAM", salesPerson: "BUDI", licensePlate: "B 8 DDD" });

    const html = await renderPage(unit.id);

    expect(html).toContain('list="brand-options"');
    expect(html).toContain('list="model-options"');
    expect(html).toContain('list="color-options"');
    expect(html).toContain('list="sales-person-options"');
    expect(html).not.toContain("<select");
    expect(html).toContain('<option value="HONDA">HONDA</option>');
    expect(html).toContain('<option value="PCX 160">PCX 160</option>');
    expect(html).toContain('<option value="MERAH">MERAH</option>');
    expect(html).toContain('<option value="ANNA">ANNA</option>');
    expect(html).toContain('<option value="YAMAHA">YAMAHA</option>');
    expect(html).toContain('<option value="NMAX">NMAX</option>');
    expect(html).toContain('<option value="HITAM">HITAM</option>');
    expect(html).toContain('<option value="BUDI">BUDI</option>');
  });

  it("renders the sell-related fields last, after the acquisition, registration and notes fields", async () => {
    const unit = await seedUnit();
    const html = await renderPage(unit.id);

    const nonSellLabels = [
      "Merek",
      "Model",
      "Tahun",
      "Plat",
      "Warna",
      "Harga Beli",
      "Biaya",
      "Tanggal Beli",
      "Nama di STNK",
      "Nomor Rangka",
      "Nomor Mesin",
      "Dibeli Dari",
      "Catatan",
    ];
    const nonSellPositions = nonSellLabels.map((label) => html.indexOf(label));
    const sellPositions = ["Harga Jual", "Tanggal Jual", "Sales Person"].map(
      (label) => html.indexOf(label),
    );

    for (const position of [...nonSellPositions, ...sellPositions]) {
      expect(position).toBeGreaterThan(-1);
    }

    const lastNonSell = Math.max(...nonSellPositions);
    for (const position of sellPositions) {
      expect(position).toBeGreaterThan(lastNonSell);
    }

    expect(sellPositions[0]).toBeLessThan(sellPositions[1]);
    expect(sellPositions[1]).toBeLessThan(sellPositions[2]);
  });

  it("pre-fills the form with the unit's current values", async () => {
    const unit = await seedUnit();
    const html = await renderPage(unit.id);

    expect(html).toContain(`action="/api/units/${unit.id}"`);
    expect(html).toContain('method="post"');
    expect(html).toContain("Simpan Perubahan");
    expect(html).toContain('value="HONDA"');
    expect(html).toContain('value="PCX 160"');
    expect(html).toContain('value="2025"');
    expect(html).toContain('value="B 9 CCC"');
    expect(html).toContain('value="MERAH"');
    expect(html).toContain('value="28000000"');
    expect(html).toContain('value="200000"');
    expect(html).toContain('value="30000000"');
    expect(html).toContain('value="2026-01-02"');
    expect(html).toContain('value="2026-02-03"');
    expect(html).toContain('value="ANNA"');
    expect(html).toContain('value="BONG, ANTON"');
    expect(html).toContain('value="MH1KFE116SK-296462"');
    expect(html).toContain('value="KFE1E-1296587"');
    expect(html).toContain('value="JBA TIPAR"');
    expect(html).toContain("BELI KEMBALI");
  });

  it("renders empty Sell Price and Date Sold for an In Stock unit", async () => {
    const unit = await seedUnit({ sellPrice: null, dateSold: null });
    const html = await renderPage(unit.id);

    expect(html).toContain('name="sellPrice"');
    expect(html).toContain('name="dateSold"');
    expect(html).not.toContain("undefined");
  });

  it("lets submitted values win over stored ones on a validation round-trip", async () => {
    const unit = await seedUnit();
    await seedUnit({ brand: "YAMAHA", model: "NMAX", licensePlate: "B 8 DDD" });
    const html = await renderPage(unit.id, {
      values: JSON.stringify({ brand: "YAMAHA", licensePlate: "B 7 XYZ" }),
    });

    expect(html).toContain('value="B 7 XYZ"');
    expect(html).toContain('value="YAMAHA"');
  });

  it("shows field errors passed in the URL", async () => {
    const unit = await seedUnit();
    const html = await renderPage(unit.id, {
      errors: JSON.stringify({ brand: "Merek wajib diisi" }),
    });

    expect(html).toContain("Merek wajib diisi");
  });

  it("offers a delete form for the Unit", async () => {
    const unit = await seedUnit();
    const html = await renderPage(unit.id);

    expect(html).toContain(`action="/api/units/${unit.id}/delete"`);
    expect(html).toContain('method="post"');
    expect(html).toContain("Hapus");
  });

  it("shows duplicate warnings passed in the URL", async () => {
    const unit = await seedUnit();
    const html = await renderPage(unit.id, { warning: "chassis,license" });

    expect(html).toContain("Nomor Rangka sudah terpakai pada unit lain.");
    expect(html).toContain("Plat sudah terpakai pada unit lain.");
  });

  it("cancels back to the Inventori list", async () => {
    const unit = await seedUnit();
    const html = await renderPage(unit.id);

    expect(html).toContain('class="nav-link" href="/">Batal');
  });
});
