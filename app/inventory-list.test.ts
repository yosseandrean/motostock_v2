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

describe("InventoryList", () => {
  it("renders the passed Units with derived Status, Invested and Gross Profit", () => {
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

  it("shows a Tambah Unit link and omits the Cari submit", () => {
    const html = render([inStock]);

    expect(html).toContain('href="/units/new"');
    expect(html).toContain("Tambah Unit");
    expect(html).not.toContain(">Cari<");
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
