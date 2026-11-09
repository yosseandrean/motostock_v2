import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
let POST: (request: Request) => Promise<Response>;

const REQUIRED = {
  brand: "HONDA",
  model: "BEAT",
  modelYear: "2023",
  licensePlate: "B 1 AAA",
  buyPrice: "10000000",
  dateBought: "2026-01-01",
};

async function submit(
  values: Record<string, string>,
  authenticated = true,
): Promise<Response> {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) {
    form.set(key, value);
  }
  const headers = new Headers();
  if (authenticated) {
    const token = await createSessionToken();
    headers.set("cookie", `${SESSION_COOKIE}=${token}`);
  }
  const request = new Request("http://localhost/api/units", {
    method: "POST",
    headers,
    body: form,
  });
  return POST(request);
}

function errorsFrom(response: Response): Record<string, string> {
  const location = new URL(response.headers.get("location")!);
  return JSON.parse(location.searchParams.get("errors") ?? "{}");
}

beforeAll(async () => {
  prisma = await createTestDb();
  POST = (await import("@/app/api/units/route")).POST;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.unit.deleteMany();
});

describe("POST /api/units", () => {
  it("creates an In Stock Unit from only the required fields", async () => {
    const response = await submit(REQUIRED);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toMatch(/\/units\/\d+\/edit$/);
    expect(await prisma.unit.count()).toBe(1);

    const unit = await prisma.unit.findFirst();
    expect(unit?.brand).toBe("HONDA");
    expect(unit?.model).toBe("BEAT");
    expect(unit?.modelYear).toBe("2023");
    expect(unit?.licensePlate).toBe("B 1 AAA");
    expect(unit?.buyPrice).toBe(10_000_000);
    expect(unit?.cost).toBe(0);
    expect(unit?.sellPrice).toBeNull();
    expect(unit?.dateSold).toBeNull();
    expect(unit?.color).toBe("");
  });

  it("creates a Sold Unit when Sell Price and Date Sold are provided", async () => {
    const response = await submit({
      ...REQUIRED,
      sellPrice: "12500000",
      dateSold: "2026-03-01",
      salesPerson: "BUDI",
    });

    expect(response.status).toBe(303);
    const unit = await prisma.unit.findFirst();
    expect(unit?.sellPrice).toBe(12_500_000);
    expect(unit?.dateSold?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(unit?.salesPerson).toBe("BUDI");
  });

  it("rejects a Sell Price without Date Sold and a Date Sold without Sell Price", async () => {
    const sellOnly = await submit({ ...REQUIRED, sellPrice: "12500000" });
    expect(sellOnly.status).toBe(303);
    expect(sellOnly.headers.get("location")).toContain("/units/new");
    expect(errorsFrom(sellOnly).dateSold).toBeTruthy();
    expect(await prisma.unit.count()).toBe(0);

    const dateOnly = await submit({ ...REQUIRED, dateSold: "2026-03-01" });
    expect(errorsFrom(dateOnly).sellPrice).toBeTruthy();
    expect(await prisma.unit.count()).toBe(0);
  });

  it("reports field errors for invalid input and creates nothing", async () => {
    const response = await submit({
      brand: "",
      model: "",
      modelYear: "abc",
      licensePlate: "",
      buyPrice: "sepuluh juta",
      dateBought: "01/01/2026",
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/units/new");

    const errors = errorsFrom(response);
    expect(errors.brand).toBeTruthy();
    expect(errors.model).toBeTruthy();
    expect(errors.modelYear).toBeTruthy();
    expect(errors.licensePlate).toBeTruthy();
    expect(errors.buyPrice).toBeTruthy();
    expect(errors.dateBought).toBeTruthy();
    expect(await prisma.unit.count()).toBe(0);
  });

  it("warns but still saves on a duplicate Chassis Serial Number", async () => {
    await prisma.unit.create({
      data: {
        ...REQUIRED,
        modelYear: "2023",
        buyPrice: 10_000_000,
        cost: 0,
        color: "MERAH",
        dateBought: new Date("2026-01-01T00:00:00.000Z"),
        chassisSerialNumber: "MH1ABC123",
      },
    });

    const response = await submit({
      ...REQUIRED,
      licensePlate: "B 2 BBB",
      chassisSerialNumber: "MH1ABC123",
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("warning=chassis");
    expect(response.headers.get("location")).toContain("/edit");
    expect(await prisma.unit.count()).toBe(2);
  });

  it("warns but still saves on a duplicate License Plate", async () => {
    await prisma.unit.create({
      data: {
        ...REQUIRED,
        modelYear: "2023",
        buyPrice: 10_000_000,
        cost: 0,
        color: "MERAH",
        dateBought: new Date("2026-01-01T00:00:00.000Z"),
        chassisSerialNumber: "MH1XYZ999",
      },
    });

    const response = await submit({
      ...REQUIRED,
      chassisSerialNumber: "MH1ABC123",
    });

    expect(response.headers.get("location")).toContain("warning=license");
    expect(response.headers.get("location")).toContain("/edit");
    expect(await prisma.unit.count()).toBe(2);
  });

  it("warns on both a duplicate Chassis Serial Number and License Plate", async () => {
    await prisma.unit.create({
      data: {
        ...REQUIRED,
        modelYear: "2023",
        buyPrice: 10_000_000,
        cost: 0,
        color: "MERAH",
        dateBought: new Date("2026-01-01T00:00:00.000Z"),
        chassisSerialNumber: "MH1ABC123",
      },
    });

    const response = await submit({
      ...REQUIRED,
      chassisSerialNumber: "MH1ABC123",
    });

    expect(response.status).toBe(303);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toMatch(/\/units\/\d+\/edit$/);
    expect(location.searchParams.get("warning")).toBe("chassis,license");
    expect(await prisma.unit.count()).toBe(2);
  });

  it("normalizes Brand, Model, Color and Sales Person to uppercase", async () => {
    await submit({
      ...REQUIRED,
      brand: "honda",
      model: "  beat  ",
      color: " merah ",
      salesPerson: " hasan ",
    });

    const unit = await prisma.unit.findFirst();
    expect(unit?.brand).toBe("HONDA");
    expect(unit?.model).toBe("BEAT");
    expect(unit?.color).toBe("MERAH");
    expect(unit?.salesPerson).toBe("HASAN");
  });

  it("accepts and saves free-text Brand, Model, Color and Sales Person values not in any suggestion list", async () => {
    const response = await submit({
      ...REQUIRED,
      brand: "kawasaki",
      model: "ninja zx-25r",
      color: " hijau metalik ",
      salesPerson: " citra ",
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toMatch(/\/units\/\d+\/edit$/);

    const unit = await prisma.unit.findFirst();
    expect(unit?.brand).toBe("KAWASAKI");
    expect(unit?.model).toBe("NINJA ZX-25R");
    expect(unit?.color).toBe("HIJAU METALIK");
    expect(unit?.salesPerson).toBe("CITRA");
  });

  it("redirects unauthenticated posts to the login page and creates nothing", async () => {
    const response = await submit(REQUIRED, false);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/login");
    expect(await prisma.unit.count()).toBe(0);
  });
});
