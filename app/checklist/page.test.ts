import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
let ChecklistPage: () => Promise<ReactElement>;

function fullCsv(): string {
  return readFileSync(path.resolve("inventory_example.csv"), "utf8");
}

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
      cost: 0,
      sellPrice: null,
      dateBought: new Date(),
      dateSold: null,
      salesPerson: null,
      nameOnRegistration: "ANNA",
      chassisSerialNumber: "MH1ABC123",
      ...overrides,
    },
  });
}

async function renderPage(): Promise<string> {
  return renderToString(await ChecklistPage());
}

beforeAll(async () => {
  prisma = await createTestDb();
  ChecklistPage = (await import("@/app/checklist/page")).default;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.unit.deleteMany();
});

describe("checklist page", () => {
  it("shows an empty state when there are no data issues", async () => {
    await seedUnit();

    const html = await renderPage();

    expect(html).toContain("Ceklis Data");
    expect(html).toContain("Tidak ada masalah data.");
  });

  it("surfaces every anomaly category with links to affected Units", async () => {
    const emptyChassis = await seedUnit({ chassisSerialNumber: null, licensePlate: "B 2 BBB" });
    const duplicateChassisA = await seedUnit({ chassisSerialNumber: "MH1DUP", licensePlate: "B 3 CCC" });
    const duplicateChassisB = await seedUnit({ chassisSerialNumber: "MH1DUP", licensePlate: "B 4 DDD" });
    const duplicatePlateA = await seedUnit({ licensePlate: "B 4529 UCB", chassisSerialNumber: "MH1P1" });
    const duplicatePlateB = await seedUnit({ licensePlate: "B 4529 UCB", chassisSerialNumber: "MH1P2" });
    const missingSalesPerson = await seedUnit({ sellPrice: 12_000_000, dateSold: new Date(), salesPerson: null, chassisSerialNumber: "MH1S1" });
    const missingColor = await seedUnit({ color: "", chassisSerialNumber: "MH1C1" });
    const missingName = await seedUnit({ nameOnRegistration: null, chassisSerialNumber: "MH1N1" });
    const splitLower = await seedUnit({ salesPerson: "hasan", chassisSerialNumber: "MH1K1" });
    const splitUpper = await seedUnit({ salesPerson: "HASAN", chassisSerialNumber: "MH1K2" });
    const loss = await seedUnit({
      brand: "HONDA",
      model: "SCOOPY PRESTIGE",
      buyPrice: 18_350_000,
      cost: 0,
      sellPrice: 15_000_000,
      dateSold: new Date(),
      chassisSerialNumber: "MH1L1",
    });
    const stale = await seedUnit({ dateBought: daysAgo(91), chassisSerialNumber: "MH1T1" });

    const html = await renderPage();

    for (const label of [
      "Nomor Rangka Kosong",
      "Nomor Rangka Duplikat",
      "Plat Duplikat",
      "Sales Person Kosong pada Unit Terjual",
      "Warna Kosong",
      "Nama di STNK Kosong",
      "Sales Person Beda Kapital",
      "Penjualan Rugi",
      "Unit Stale",
    ]) {
      expect(html).toContain(label);
    }

    // Each affected Unit links to its detail page.
    for (const unit of [
      emptyChassis,
      duplicateChassisA,
      duplicateChassisB,
      duplicatePlateA,
      duplicatePlateB,
      missingSalesPerson,
      missingColor,
      missingName,
      splitLower,
      splitUpper,
      loss,
      stale,
    ]) {
      expect(html).toContain(`href="/units/${unit.id}"`);
    }

    // Category-specific details are visible.
    expect(html).toContain("MH1DUP");
    expect(html).toContain("B 4529 UCB");
    expect(html).toContain("hasan");
    expect(html).toContain("SCOOPY PRESTIGE");
    expect(html.replace(/\u00a0/g, " ")).toContain("-Rp 3.350.000");
    expect(html).toContain("91 hari");
  });

  it("matches the known issues in inventory_example.csv", async () => {
    const { importInventoryCsv } = await import("@/lib/import");
    await importInventoryCsv(fullCsv());

    const html = await renderPage();

    expect(html).toContain('class="checklist-count">112</span>');
    expect(html).toContain('class="checklist-count">95</span>');
    expect(html).toContain('class="checklist-count">9</span>');
    expect(html).toContain('class="checklist-count">19</span>');
    expect(html).toContain("B 4529 UCB");
    // The known loss-making sale is surfaced too.
    expect(html).toContain("SCOOPY PRESTIGE");
  });
});
