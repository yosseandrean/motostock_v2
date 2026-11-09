import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
type Params = { id: string };
type SearchParams = { warning?: string };
let UnitDetailPage: (props: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) => Promise<ReactElement>;

async function renderPage(
  id: string | number,
  searchParams: SearchParams = {},
): Promise<string> {
  const element = await UnitDetailPage({
    params: Promise.resolve({ id: String(id) }),
    searchParams: Promise.resolve(searchParams),
  });
  return renderToString(element);
}

beforeAll(async () => {
  prisma = await createTestDb();
  UnitDetailPage = (await import("@/app/units/[id]/page")).default;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.unit.deleteMany();
});

describe("unit detail page", () => {
  it("shows all 16 fields with their values", async () => {
    const unit = await prisma.unit.create({
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
      },
    });

    const html = await renderPage(unit.id);

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

    expect(html).toContain("HONDA");
    expect(html).toContain("PCX 160");
    expect(html).toContain("2025");
    expect(html).toContain("B 9 CCC");
    expect(html).toContain("MERAH");
    expect(html).toContain("28.000.000");
    expect(html).toContain("200.000");
    expect(html).toContain("30.000.000");
    expect(html).toContain("ANNA");
    expect(html).toContain("BONG, ANTON");
    expect(html).toContain("MH1KFE116SK-296462");
    expect(html).toContain("KFE1E-1296587");
    expect(html).toContain("JBA TIPAR");
    expect(html).toContain("BELI KEMBALI");
  });

  it("renders empty optional fields as blank", async () => {
    const unit = await prisma.unit.create({
      data: {
        brand: "HONDA",
        model: "BEAT",
        modelYear: "2023",
        licensePlate: "B 1 AAA",
        color: "MERAH",
        buyPrice: 10_000_000,
        cost: 0,
        sellPrice: null,
        dateBought: new Date("2026-01-01T12:00:00.000Z"),
        dateSold: null,
      },
    });

    const html = await renderPage(unit.id);

    expect(html).toContain('<th scope="row">Sales Person</th><td></td>');
    expect(html).toContain('<th scope="row">Nama di STNK</th><td></td>');
    expect(html).toContain('<th scope="row">Nomor Rangka</th><td></td>');
    expect(html).toContain('<th scope="row">Nomor Mesin</th><td></td>');
    expect(html).toContain('<th scope="row">Dibeli Dari</th><td></td>');
    expect(html).toContain('<th scope="row">Catatan</th><td></td>');
    expect(html).toContain('<th scope="row">Harga Jual</th><td></td>');
    expect(html).toContain('<th scope="row">Tanggal Jual</th><td></td>');
  });

  it("shows duplicate warnings passed in the URL", async () => {
    const unit = await prisma.unit.create({
      data: {
        brand: "HONDA",
        model: "BEAT",
        modelYear: "2023",
        licensePlate: "B 1 AAA",
        color: "MERAH",
        buyPrice: 10_000_000,
        cost: 0,
        sellPrice: null,
        dateBought: new Date("2026-01-01T12:00:00.000Z"),
        dateSold: null,
      },
    });

    const html = await renderPage(unit.id, { warning: "chassis,license" });

    expect(html).toContain("Nomor Rangka sudah terpakai pada unit lain.");
    expect(html).toContain("Plat sudah terpakai pada unit lain.");
  });

  it("links to the edit page and offers a delete form", async () => {
    const unit = await prisma.unit.create({
      data: {
        brand: "HONDA",
        model: "BEAT",
        modelYear: "2023",
        licensePlate: "B 1 AAA",
        color: "MERAH",
        buyPrice: 10_000_000,
        cost: 0,
        sellPrice: null,
        dateBought: new Date("2026-01-01T12:00:00.000Z"),
        dateSold: null,
      },
    });

    const html = await renderPage(unit.id);

    expect(html).toContain(`href="/units/${unit.id}/edit"`);
    expect(html).toContain(`action="/api/units/${unit.id}/delete"`);
    expect(html).toContain('method="post"');
    expect(html).toContain("Hapus");
  });
});
