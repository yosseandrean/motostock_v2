import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
type SearchParams = { q?: string; status?: string };
let InventoryPage: (props: { searchParams: Promise<SearchParams> }) => Promise<ReactElement>;

async function seedUnit(overrides: Record<string, unknown> = {}) {
  return prisma.unit.create({
    data: {
      brand: "HONDA",
      model: "BEAT",
      modelYear: "2023",
      licensePlate: "B 1 AAA",
      color: "MERAH",
      buyPrice: 10_000_000,
      cost: 500_000,
      sellPrice: null,
      dateBought: new Date("2026-01-01T12:00:00.000Z"),
      dateSold: null,
      salesPerson: null,
      chassisSerialNumber: "MH1ABC123",
      ...overrides,
    },
  });
}

async function renderPage(params: SearchParams = {}): Promise<string> {
  const element = await InventoryPage({ searchParams: Promise.resolve(params) });
  return renderToString(element);
}

beforeAll(async () => {
  prisma = await createTestDb();
  InventoryPage = (await import("@/app/page")).default;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.unit.deleteMany();
});

describe("inventory list page", () => {
  it("renders key columns with derived Status and computed Invested / Gross Profit", async () => {
    const inStock = await seedUnit();
    const sold = await seedUnit({
      brand: "YAMAHA",
      model: "NMAX",
      modelYear: "2022",
      licensePlate: "B 2 BBB",
      buyPrice: 20_000_000,
      cost: 1_000_000,
      sellPrice: 25_000_000,
      dateBought: new Date("2025-06-01T12:00:00.000Z"),
      dateSold: new Date("2025-12-01T12:00:00.000Z"),
      salesPerson: "BUDI",
      chassisSerialNumber: "MH1XYZ999",
    });

    const html = await renderPage();

    for (const header of [
      "Merek",
      "Model",
      "Tahun",
      "Plat",
      "Status",
      "Harga Beli",
      "Harga Jual",
      "Tanggal Beli",
      "Tanggal Jual",
      "Sales Person",
      "Invested",
      "Gross Profit",
    ]) {
      expect(html).toContain(header);
    }

    // In Stock Unit: Invested = Buy Price + Cost, Gross Profit blank.
    expect(html).toContain("HONDA");
    expect(html).toContain("BEAT");
    expect(html).toContain("Stok");
    expect(html).toContain("10.500.000");
    expect(html).toContain("—");

    // Sold Unit: Invested and Gross Profit computed from Sell Price.
    expect(html).toContain("YAMAHA");
    expect(html).toContain("NMAX");
    expect(html).toContain("Terjual");
    expect(html).toContain("21.000.000");
    expect(html).toContain("4.000.000");

    // Each row links to the Unit detail page.
    expect(html).toContain(`href="/units/${inStock.id}"`);
    expect(html).toContain(`href="/units/${sold.id}"`);
  });

  it("filters by free text across Brand, Model, License Plate, Chassis Serial Number and Sales Person", async () => {
    await seedUnit();
    await seedUnit({
      brand: "YAMAHA",
      model: "NMAX",
      licensePlate: "B 2 BBB",
      salesPerson: "BUDI",
      chassisSerialNumber: "MH1XYZ999",
    });

    const html = await renderPage({ q: "yamaha" });

    expect(html).toContain("YAMAHA");
    expect(html).not.toContain("HONDA");
  });

  it("filters by derived Status", async () => {
    await seedUnit();
    await seedUnit({
      brand: "YAMAHA",
      model: "NMAX",
      sellPrice: 25_000_000,
      dateSold: new Date("2025-12-01T12:00:00.000Z"),
    });

    const inStockHtml = await renderPage({ status: "stok" });
    expect(inStockHtml).toContain("HONDA");
    expect(inStockHtml).not.toContain("YAMAHA");

    const soldHtml = await renderPage({ status: "terjual" });
    expect(soldHtml).toContain("YAMAHA");
    expect(soldHtml).not.toContain("HONDA");
  });

  it("shows the empty state when there are no Units", async () => {
    const html = await renderPage();

    expect(html).toContain("Belum ada unit.");
  });
});
