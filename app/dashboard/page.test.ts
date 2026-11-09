import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
let DashboardPage: () => Promise<ReactElement>;

/** A Date Bought exactly `daysAgo` calendar days before now. */
function bought(daysAgo: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date;
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
      cost: 500_000,
      sellPrice: null,
      dateBought: bought(0),
      dateSold: null,
      ...overrides,
    },
  });
}

async function renderPage(): Promise<string> {
  const element = await DashboardPage();
  return renderToString(element);
}

beforeAll(async () => {
  prisma = await createTestDb();
  DashboardPage = (await import("@/app/dashboard/page")).default;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.unit.deleteMany();
});

describe("inventory dashboard page", () => {
  it("shows In Stock count and total Modal, ignoring Sold Units", async () => {
    await seedUnit({ buyPrice: 10_000_000, cost: 500_000 });
    await seedUnit({
      brand: "YAMAHA",
      model: "NMAX",
      buyPrice: 20_000_000,
      cost: 1_000_000,
    });
    await seedUnit({
      brand: "SUZUKI",
      model: "SATRIA",
      sellPrice: 15_000_000,
      dateSold: new Date(),
    });

    const html = await renderPage();

    expect(html).toContain("Unit Tersedia");
    expect(html).toContain("Umur Tersedia");
    expect(html).toContain("Total Modal");
    expect(html).toContain('<span class="summary-value">2</span>');
    expect(html).toContain("31.500.000");
    expect(html).not.toContain("SUZUKI");
    expect(html).not.toContain("Stok");
  });

  it("renders all aging buckets and the Stale list", async () => {
    const stale = await seedUnit({
      brand: "YAMAHA",
      model: "NMAX",
      color: "BIRU",
      licensePlate: "B 4 DDD",
      buyPrice: 22_000_000,
      cost: 2_000_000,
      dateBought: bought(91),
    });

    const html = await renderPage();

    for (const label of [
      "Kurang dari 30 hari",
      "30–60 hari",
      "60–90 hari",
      "Lebih dari 90 hari",
    ]) {
      expect(html).toContain(label);
    }

    expect(html).toContain("Unit Stale");
    // The Stale row is a clickable target, not a Merek detail-page link.
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label="Detail YAMAHA NMAX"');
    expect(html).not.toContain(`href="/units/${stale.id}"`);
    expect(html).not.toContain('class="unit-link"');
    expect(html).toContain("NMAX");
    expect(html).toContain("<td>91</td>");
    expect(html).toContain("24.000.000");
  });

  it("breaks down In Stock Units by Brand and Model", async () => {
    await seedUnit({ brand: "HONDA", model: "BEAT", color: "MERAH", buyPrice: 10_000_000, cost: 500_000 });
    await seedUnit({ brand: "HONDA", model: "BEAT", color: "HITAM", buyPrice: 11_000_000, cost: 1_000_000 });
    await seedUnit({ brand: "YAMAHA", model: "NMAX", color: "HITAM", buyPrice: 20_000_000, cost: 1_000_000 });
    await seedUnit({ brand: "YAMAHA", model: "NMAX", color: "BIRU", buyPrice: 22_000_000, cost: 2_000_000 });

    const html = await renderPage();

    expect(html).toContain("Per Merek");
    expect(html).toContain("Per Model");
    expect(html).not.toContain("Per Warna");

    // Brand Modal totals.
    expect(html).toContain("22.500.000");
    expect(html).toContain("45.000.000");
  });

  it("shows empty states when there is nothing in stock", async () => {
    const html = await renderPage();

    expect(html).toContain("Tidak ada unit stale.");
    expect(html).toContain("Tidak ada data.");
  });
});
