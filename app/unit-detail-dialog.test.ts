import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UnitDetailView } from "@/app/unit-detail-dialog";
import type { UnitDetail } from "@/app/unit-detail-dialog";

const base: UnitDetail = {
  id: 1,
  brand: "HONDA",
  model: "BEAT",
  modelYear: "2023",
  licensePlate: "B 1 AAA",
  color: "MERAH",
  buyPrice: 10_000_000,
  cost: 0,
  sellPrice: null,
  dateBought: "2026-01-01T00:00:00.000Z",
  dateSold: null,
  salesPerson: null,
  nameOnRegistration: null,
  chassisSerialNumber: null,
  engineSerialNumber: null,
  boughtFrom: null,
  notes: null,
};

function render(unit: UnitDetail): string {
  return renderToString(createElement(UnitDetailView, { unit, unitId: unit.id }));
}

describe("UnitDetailView", () => {
  it("shows a Jual action for an In Stock Unit next to Ubah", () => {
    const html = render(base);

    expect(html).toContain('href="/units/1/sell"');
    expect(html).toContain("Jual");
    expect(html).toContain('href="/units/1/edit"');
    expect(html).toContain("Ubah");
  });

  it("hides the Jual action for a Sold Unit", () => {
    const sold: UnitDetail = {
      ...base,
      sellPrice: 12_000_000,
      dateSold: "2026-03-01T00:00:00.000Z",
    };
    const html = render(sold);

    expect(html).not.toContain('href="/units/1/sell"');
    expect(html).not.toContain(">Jual<");
    expect(html).toContain("Ubah");
  });
});
