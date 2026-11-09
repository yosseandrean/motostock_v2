import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
type Params = { id: string };
type SearchParams = { errors?: string; values?: string };
let SellUnitPage: (props: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) => Promise<ReactElement>;

async function renderPage(
  id: string | number,
  searchParams: SearchParams = {},
): Promise<string> {
  const element = await SellUnitPage({
    params: Promise.resolve({ id: String(id) }),
    searchParams: Promise.resolve(searchParams),
  });
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
  SellUnitPage = (await import("@/app/units/[id]/sell/page")).default;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.unit.deleteMany();
});

describe("sell unit page", () => {
  it("renders a three-field sell form targeting the sell route", async () => {
    const unit = await seedUnit();
    const html = await renderPage(unit.id);

    expect(html).toContain(`action="/api/units/${unit.id}/sell"`);
    expect(html).toContain('method="post"');
    for (const name of ["sellPrice", "dateSold", "salesPerson"]) {
      expect(html).toContain(`name="${name}"`);
    }
    expect(html).toContain("Harga Jual");
    expect(html).toContain("Tanggal Jual");
    expect(html).toContain("Sales Person");
    expect(html).toContain(">Jual</button>");
    expect(html).toContain('class="nav-link" href="/">Batal');
  });

  it("identifies the Unit being sold and defaults Date Sold to today's WIB date", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-08T17:30:00.000Z"));
    try {
      const unit = await seedUnit({ model: "PCX 160", licensePlate: "B 9 CCC" });
      const html = await renderPage(unit.id);

      expect(html).toContain("HONDA PCX 160 · B 9 CCC");
      expect(html).toContain('value="2026-11-09"');
    } finally {
      vi.useRealTimers();
    }
  });

  it("offers the Sales Person catalog from existing Units", async () => {
    await seedUnit({ salesPerson: "HASAN", licensePlate: "B 2 BBB" });
    await seedUnit({ salesPerson: "BUDI", licensePlate: "B 3 CCC" });
    const unit = await seedUnit();

    const html = await renderPage(unit.id);

    expect(html).toContain('<option value="HASAN">HASAN</option>');
    expect(html).toContain('<option value="BUDI">BUDI</option>');
  });

  it("shows field errors passed in the URL", async () => {
    const unit = await seedUnit();
    const html = await renderPage(unit.id, {
      errors: JSON.stringify({
        sellPrice: "Harga Jual harus angka",
        dateSold: "Tanggal Jual tidak valid",
      }),
    });

    expect(html).toContain("Harga Jual harus angka");
    expect(html).toContain("Tanggal Jual tidak valid");
  });

  it("preserves submitted values on a validation round-trip", async () => {
    await seedUnit({ salesPerson: "HASAN", licensePlate: "B 2 BBB" });
    const unit = await seedUnit();
    const html = await renderPage(unit.id, {
      values: JSON.stringify({
        sellPrice: "12500000",
        dateSold: "2026-03-01",
        salesPerson: "HASAN",
      }),
    });

    expect(html).toContain('value="12500000"');
    expect(html).toContain('value="2026-03-01"');
    expect(html).toContain('value="HASAN"');
  });
});
