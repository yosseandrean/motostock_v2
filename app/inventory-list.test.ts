import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InventoryList } from "@/app/inventory-list";
import type { InventoryUnit } from "@/lib/unit";

const inStock: InventoryUnit = {
  id: 1,
  brand: "HONDA",
  model: "BEAT",
  modelYear: "2023",
  licensePlate: "B 1 AAA",
  chassisSerialNumber: "MH1ABC123",
  salesPerson: "ANNA",
  buyPrice: 10_000_000,
  cost: 500_000,
  sellPrice: null,
  dateBoughtLabel: "1 Januari 2026",
  dateSoldLabel: null,
};

const sold: InventoryUnit = {
  ...inStock,
  id: 2,
  brand: "YAMAHA",
  model: "NMAX",
  buyPrice: 20_000_000,
  cost: 1_000_000,
  sellPrice: 25_000_000,
  dateSoldLabel: "1 Desember 2025",
};

function render(units: InventoryUnit[]): string {
  return renderToString(createElement(InventoryList, { units }));
}

function headerTexts(html: string): string[] {
  const thead = html.match(/<thead>([\s\S]*?)<\/thead>/)?.[1] ?? "";
  return [...thead.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(
    (match) => match[1],
  );
}

function rowCells(html: string, rowIndex = 1): string[] {
  const tbody = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  const rows = [...tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
  const row = rows[rowIndex - 1]?.[1] ?? "";
  return [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(
    (match) => match[1],
  );
}

describe("InventoryList", () => {
  it("renders the passed Units with derived Status, Modal and Laba Kotor", () => {
    const html = render([inStock, sold]);

    expect(html).toContain("HONDA");
    expect(html).toContain("BEAT");
    expect(html).toContain("Stok");
    expect(html).toContain("10.500.000");

    expect(html).toContain("YAMAHA");
    expect(html).toContain("NMAX");
    expect(html).toContain("Terjual");
    expect(html).toContain("4.000.000");

    // Rows are clickable (not a Merek link), and the dialog is closed.
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain('href="/units/1"');
    expect(html).not.toContain('href="/units/2"');
  });

  it("orders columns Status-first and labels Invested/Gross Profit as Modal/Laba Kotor", () => {
    const html = render([inStock]);

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
  });

  it("keeps the Status badge first and shows the Modal hover/focus breakdown", () => {
    const html = render([inStock, sold]);

    expect(html).toMatch(
      /title="Harga Beli Rp\u00a010\.000\.000 · Biaya Rp\u00a0500\.000"/,
    );

    const firstRow = rowCells(html, 1);
    expect(firstRow[0]).toContain("status-badge status-badge--stok");
    expect(firstRow[0]).toContain("Stok");

    const secondRow = rowCells(html, 2);
    expect(secondRow[0]).toContain("status-badge status-badge--terjual");
    expect(secondRow[0]).toContain("Terjual");
  });

  it("shows a Tambah Unit link and omits the Cari submit", () => {
    const html = render([inStock]);

    expect(html).toContain('href="/units/new"');
    expect(html).toContain("Tambah Unit");
    expect(html).not.toContain(">Cari<");
  });

  it("keeps live search and Status filters without a Reset button", () => {
    const html = render([inStock]);

    expect(html).toContain('type="search"');
    expect(html).toContain('aria-label="Cari unit"');
    expect(html).toContain("Semua status");
    expect(html).toContain('<option value="stok">Stok</option>');
    expect(html).toContain('<option value="terjual">Terjual</option>');
    expect(html).not.toContain("Reset");
    expect(html).not.toContain('type="submit"');
  });

  it("renders a clickable row with the dialog closed and no Merek link", () => {
    const html = render([inStock]);

    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain('href="/units/1"');
    expect(html).not.toContain('class="unit-link"');
    expect(html).not.toContain(">Ubah<");
    expect(html).not.toContain(">Tutup<");
  });
});
