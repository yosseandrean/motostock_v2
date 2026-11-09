import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
type SearchParams = { preset?: string; from?: string; to?: string };
let SalesPage: (props: { searchParams: Promise<SearchParams> }) => Promise<ReactElement>;

function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
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
      sellPrice: 13_000_000,
      dateBought: daysAgo(30),
      dateSold: new Date(),
      salesPerson: "HASAN",
      ...overrides,
    },
  });
}

async function renderPage(params: SearchParams = {}): Promise<string> {
  const element = await SalesPage({ searchParams: Promise.resolve(params) });
  return renderToString(element);
}

beforeAll(async () => {
  prisma = await createTestDb();
  SalesPage = (await import("@/app/sales/page")).default;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.unit.deleteMany();
});

describe("sales dashboard page", () => {
  it("shows headline figures for the default This month period", async () => {
    await seedUnit(); // buy 10,000,000 + 500,000, sell 13,000,000

    const html = await renderPage();

    expect(html).toContain("Unit Terjual");
    expect(html).toContain("Pendapatan");
    expect(html).toContain("Laba Kotor");
    expect(html).toContain("Margin");
    expect(html).toContain('<span class="summary-value">1</span>');
    expect(html).toContain("13.000.000");
    expect(html).toContain("2.500.000");
    expect(html).toContain("19,2%");
  });

  it("surfaces loss-making sales with links to the Unit", async () => {
    const loss = await seedUnit({
      brand: "HONDA",
      model: "SCOOPY PRESTIGE",
      buyPrice: 18_350_000,
      cost: 0,
      sellPrice: 15_000_000,
    });

    const html = await renderPage();

    expect(html).toContain("Penjualan Rugi");
    expect(html).toContain("SCOOPY PRESTIGE");
    expect(html).toContain(`href="/units/${loss.id}"`);
    expect(html.replace(/\u00a0/g, " ")).toContain("-Rp 3.350.000");
  });

  it("renders every period preset and the three breakdown tables", async () => {
    await seedUnit();
    await seedUnit({
      brand: "YAMAHA",
      model: "NMAX",
      licensePlate: "B 2 BBB",
      salesPerson: "BUDI",
      sellPrice: 20_000_000,
    });

    const html = await renderPage();

    for (const label of [
      "Bulan ini",
      "Bulan lalu",
      "3 bulan terakhir",
      "Tahun ini",
      "Semua waktu",
      "Kustom",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("Per Merek");
    expect(html).toContain("Per Model");
    expect(html).toContain("Per Sales Person");
  });

  it("excludes older sales by default but includes them with All time", async () => {
    await seedUnit({ brand: "SUZUKI", model: "SATRIA", dateSold: daysAgo(400) });

    const defaultHtml = await renderPage();
    expect(defaultHtml).not.toContain("SUZUKI");

    const allTimeHtml = await renderPage({ preset: "all-time" });
    expect(allTimeHtml).toContain("SUZUKI");
  });

  it("honors a Custom from/to range", async () => {
    await seedUnit({ brand: "SUZUKI", model: "SATRIA", dateSold: daysAgo(400) });

    const html = await renderPage({
      preset: "custom",
      from: "2000-01-01",
      to: "2099-12-31",
    });

    expect(html).toContain("SUZUKI");
    expect(html).toContain('value="2000-01-01"');
    expect(html).toContain('value="2099-12-31"');
  });

  it("falls back to This month when a Custom range is incomplete", async () => {
    await seedUnit({ brand: "SUZUKI", model: "SATRIA", dateSold: daysAgo(400) });

    const html = await renderPage({ preset: "custom" });

    expect(html).not.toContain("SUZUKI");
  });

  it("serializes the weekly trend chart data into the page", async () => {
    await seedUnit(); // buy 10,000,000 + 500,000, sell 13,000,000

    const html = await renderPage();

    expect(html).toContain('<h2 class="section-title">Tren</h2>');
    expect(html).not.toContain("Tren Bulanan");
    // The old server-rendered table is gone; the trend is now a Recharts chart.
    expect(html).not.toContain('<th scope="col">Bulan</th>');
    expect(html).toContain("trend-chart");

    const match = html.match(
      /<script type="application\/json" id="sales-trend">(.*?)<\/script>/,
    );
    expect(match).not.toBeNull();
    const trend = JSON.parse(match![1]);

    // A single This-month period is short enough to be bucketed weekly.
    expect(trend.length).toBeGreaterThan(1);
    expect(trend.reduce((sum: number, point: { revenue: number }) => sum + point.revenue, 0)).toBe(13_000_000);
    expect(trend.reduce((sum: number, point: { grossProfit: number }) => sum + point.grossProfit, 0)).toBe(2_500_000);
  });
});
