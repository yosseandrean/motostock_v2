import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import { createTestDb } from "@/test/helpers";

type RouteHandler = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

let prisma: PrismaClient;
let POST: RouteHandler;

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

async function submit(
  id: string | number,
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
  const request = new Request(`http://localhost/api/units/${id}/sell`, {
    method: "POST",
    headers,
    body: form,
  });
  return POST(request, { params: Promise.resolve({ id: String(id) }) });
}

function errorsFrom(response: Response): Record<string, string> {
  const location = new URL(response.headers.get("location")!);
  return JSON.parse(location.searchParams.get("errors") ?? "{}");
}

beforeAll(async () => {
  prisma = await createTestDb();
  POST = (await import("@/app/api/units/[id]/sell/route")).POST;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.unit.deleteMany();
});

describe("POST /api/units/[id]/sell", () => {
  it("sells an In Stock Unit and redirects to the inventory list", async () => {
    const unit = await seedUnit();

    const response = await submit(unit.id, {
      sellPrice: "12500000",
      dateSold: "2026-03-01",
      salesPerson: "BUDI",
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/");

    const updated = await prisma.unit.findUnique({ where: { id: unit.id } });
    expect(updated?.sellPrice).toBe(12_500_000);
    expect(updated?.dateSold?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(updated?.salesPerson).toBe("BUDI");
  });

  it("marks the Unit Sold even when Sales Person is empty", async () => {
    const unit = await seedUnit();

    const response = await submit(unit.id, {
      sellPrice: "12500000",
      dateSold: "2026-03-01",
      salesPerson: "",
    });

    expect(response.status).toBe(303);
    const updated = await prisma.unit.findUnique({ where: { id: unit.id } });
    expect(updated?.sellPrice).toBe(12_500_000);
    expect(updated?.salesPerson).toBeNull();
  });

  it("rejects a missing Sell Price and persists nothing", async () => {
    const unit = await seedUnit();

    const response = await submit(unit.id, {
      sellPrice: "",
      dateSold: "2026-03-01",
      salesPerson: "BUDI",
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain(
      `/units/${unit.id}/sell`,
    );
    expect(errorsFrom(response).sellPrice).toBeTruthy();

    const stored = await prisma.unit.findUnique({ where: { id: unit.id } });
    expect(stored?.sellPrice).toBeNull();
    expect(stored?.dateSold).toBeNull();
    expect(stored?.salesPerson).toBeNull();
  });

  it("rejects an invalid Sell Price and persists nothing", async () => {
    const unit = await seedUnit();

    const response = await submit(unit.id, {
      sellPrice: "sepuluh juta",
      dateSold: "2026-03-01",
      salesPerson: "BUDI",
    });

    expect(errorsFrom(response).sellPrice).toBeTruthy();
    const stored = await prisma.unit.findUnique({ where: { id: unit.id } });
    expect(stored?.sellPrice).toBeNull();
  });

  it("rejects a missing Date Sold and persists nothing", async () => {
    const unit = await seedUnit();

    const response = await submit(unit.id, {
      sellPrice: "12500000",
      dateSold: "",
      salesPerson: "BUDI",
    });

    expect(response.headers.get("location")).toContain(
      `/units/${unit.id}/sell`,
    );
    expect(errorsFrom(response).dateSold).toBeTruthy();

    const stored = await prisma.unit.findUnique({ where: { id: unit.id } });
    expect(stored?.sellPrice).toBeNull();
  });

  it("rejects an invalid Date Sold and persists nothing", async () => {
    const unit = await seedUnit();

    const response = await submit(unit.id, {
      sellPrice: "12500000",
      dateSold: "01/01/2026",
      salesPerson: "BUDI",
    });

    expect(errorsFrom(response).dateSold).toBeTruthy();
    const stored = await prisma.unit.findUnique({ where: { id: unit.id } });
    expect(stored?.sellPrice).toBeNull();
  });

  it("normalizes Sales Person to uppercase", async () => {
    const unit = await seedUnit();

    await submit(unit.id, {
      sellPrice: "12500000",
      dateSold: "2026-03-01",
      salesPerson: "  hasan  ",
    });

    const updated = await prisma.unit.findUnique({ where: { id: unit.id } });
    expect(updated?.salesPerson).toBe("HASAN");
  });

  it("redirects unauthenticated posts to the login page and changes nothing", async () => {
    const unit = await seedUnit();

    const response = await submit(
      unit.id,
      {
        sellPrice: "12500000",
        dateSold: "2026-03-01",
        salesPerson: "BUDI",
      },
      false,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/login");
    const stored = await prisma.unit.findUnique({ where: { id: unit.id } });
    expect(stored?.sellPrice).toBeNull();
  });

  it("returns 404 for a missing Unit", async () => {
    const response = await submit(999, {
      sellPrice: "12500000",
      dateSold: "2026-03-01",
    });

    expect(response.status).toBe(404);
  });

  it("returns 404 for a non-numeric id", async () => {
    const response = await submit("abc", {
      sellPrice: "12500000",
      dateSold: "2026-03-01",
    });

    expect(response.status).toBe(404);
  });
});
