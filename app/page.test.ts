import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
let InventoryPage: () => Promise<ReactElement>;

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

async function renderPage(): Promise<string> {
  const element = await InventoryPage();
  return renderToString(element);
}

function headerTexts(html: string): string[] {
  const thead = html.match(/<thead>([\s\S]*?)<\/thead>/)?.[1] ?? "";
  return [...thead.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(
    (match) => match[1],
  );
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
  it("renders key columns with derived Status and computed Modal / Laba Kotor", async () => {
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

    expect(headerTexts(html)).toEqual([
      "Status",
      "Merek",
      "Model",
      "Tahun",
      "Plat",
      "Modal",
      "Harga Jual",
      "Laba Kotor",
      "Tanggal Beli",
      "Tanggal Jual",
      "Sales Person",
    ]);
    expect(headerTexts(html)).not.toContain("Harga Beli");

    // In Stock Unit: Modal = Buy Price + Cost, Laba Kotor blank.
    expect(html).toContain("HONDA");
    expect(html).toContain("BEAT");
    expect(html).toContain("Stok");
    expect(html).toContain("10.500.000");
    expect(html).toContain("—");

    // Sold Unit: Modal and Laba Kotor computed from Sell Price.
    expect(html).toContain("YAMAHA");
    expect(html).toContain("NMAX");
    expect(html).toContain("Terjual");
    expect(html).toContain("21.000.000");
    expect(html).toContain("4.000.000");

    // Each row is a clickable target, not a Merek detail link.
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain(`href="/units/${inStock.id}"`);
    expect(html).not.toContain(`href="/units/${sold.id}"`);
  });

  it("adds a Tambah Unit link and removes the Cari submit", async () => {
    const html = await renderPage();

    expect(html).toContain('href="/units/new"');
    expect(html).toContain("Tambah Unit");
    expect(html).not.toContain(">Cari<");
  });

  it("renders live search and Status filters without a Reset button", async () => {
    const html = await renderPage();
    const filterBar = html.match(/<div class="filter-bar">([\s\S]*?)<\/div>/)?.[1] ?? "";

    expect(filterBar).toContain('type="search"');
    expect(filterBar).toContain('aria-label="Cari unit"');
    expect(filterBar).toContain("Semua status");
    expect(filterBar).toContain('<option value="stok">Stok</option>');
    expect(filterBar).toContain('<option value="terjual">Terjual</option>');
    expect(filterBar).not.toContain("Reset");
    expect(filterBar).not.toContain('type="submit"');
  });

  it("shows the empty state when there are no Units", async () => {
    const html = await renderPage();

    expect(html).toContain("Belum ada unit.");
  });
});
