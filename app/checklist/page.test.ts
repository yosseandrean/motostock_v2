import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
let ChecklistPage: () => Promise<ReactElement>;

function fullCsv(): string {
  return readFileSync(path.resolve("inventory_example.csv"), "utf8");
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

    expect(html).toContain("Data Bermasalah");
    expect(html).toContain("Tidak ada masalah data.");
  });

  it("surfaces every anomaly category with clickable Unit rows", async () => {
    const emptyChassis = await seedUnit({ chassisSerialNumber: null, licensePlate: "B 2 BBB" });
    const duplicateChassisA = await seedUnit({ chassisSerialNumber: "MH1DUP", licensePlate: "B 3 CCC" });
    const duplicateChassisB = await seedUnit({ chassisSerialNumber: "MH1DUP", licensePlate: "B 4 DDD" });
    const duplicatePlateA = await seedUnit({ licensePlate: "B 4529 UCB", chassisSerialNumber: "MH1P1" });
    const duplicatePlateB = await seedUnit({ licensePlate: "B 4529 UCB", chassisSerialNumber: "MH1P2" });
    const missingColor = await seedUnit({ color: "", chassisSerialNumber: "MH1C1" });
    const missingName = await seedUnit({ nameOnRegistration: null, chassisSerialNumber: "MH1N1" });
    const splitLower = await seedUnit({ salesPerson: "hasan", chassisSerialNumber: "MH1K1" });
    const splitUpper = await seedUnit({ salesPerson: "HASAN", chassisSerialNumber: "MH1K2" });

    const html = await renderPage();

    for (const label of [
      "Nomor Rangka Kosong",
      "Nomor Rangka Duplikat",
      "Plat Duplikat",
      "Warna Kosong",
      "Nama di STNK Kosong",
      "Sales Person Beda Kapital",
    ]) {
      expect(html).toContain(label);
    }

    // Each affected Unit row is a clickable target, not a detail-page link.
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    for (const unit of [
      emptyChassis,
      duplicateChassisA,
      duplicateChassisB,
      duplicatePlateA,
      duplicatePlateB,
      missingColor,
      missingName,
      splitLower,
      splitUpper,
    ]) {
      expect(html).not.toContain(`href="/units/${unit.id}"`);
    }
    expect(html).not.toContain('class="unit-link"');

    // Category-specific details are visible.
    expect(html).toContain("MH1DUP");
    expect(html).toContain("B 4529 UCB");
    expect(html).toContain("hasan");
  });

  it("matches the known issues in inventory_example.csv", async () => {
    const { importInventoryCsv } = await import("@/lib/import");
    await importInventoryCsv(fullCsv());

    const html = await renderPage();

    expect(html).toContain('class="checklist-count">112</span>');
    expect(html).toContain('class="checklist-count">9</span>');
    expect(html).toContain('class="checklist-count">19</span>');
    expect(html).toContain("B 4529 UCB");
  });

  it("keeps the constrained shell width", async () => {
    const html = await renderPage();

    expect(html).toContain('<main class="inventory-shell">');
    expect(html).not.toContain("inventory-shell--wide");
  });
});
