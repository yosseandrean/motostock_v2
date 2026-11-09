import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
let POST: (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

const REQUIRED = {
  brand: "HONDA",
  model: "BEAT",
  modelYear: "2023",
  licensePlate: "B 1 AAA",
  buyPrice: "10000000",
  dateBought: "2026-01-01",
};

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
  const request = new Request(`http://localhost/api/units/${id}`, {
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
  POST = (await import("@/app/api/units/[id]/route")).POST;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.unit.deleteMany();
});

describe("POST /api/units/[id]", () => {
  it("updates an existing Unit's fields and redirects to its detail page", async () => {
    const unit = await seedUnit();

    const response = await submit(unit.id, {
      ...REQUIRED,
      brand: "YAMAHA",
      color: "HITAM",
      buyPrice: "12000000",
      notes: "SUDAH DIUBAH",
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `http://localhost/units/${unit.id}`,
    );

    const updated = await prisma.unit.findUnique({ where: { id: unit.id } });
    expect(updated?.brand).toBe("YAMAHA");
    expect(updated?.color).toBe("HITAM");
    expect(updated?.buyPrice).toBe(12_000_000);
    expect(updated?.notes).toBe("SUDAH DIUBAH");
    expect(updated?.model).toBe("BEAT");
  });

  it("returns a Sold Unit to In Stock when Sell Price and Date Sold are cleared", async () => {
    const unit = await seedUnit({
      sellPrice: 12_500_000,
      dateSold: new Date("2026-03-01T00:00:00.000Z"),
      salesPerson: "BUDI",
    });

    const response = await submit(unit.id, {
      ...REQUIRED,
      sellPrice: "",
      dateSold: "",
    });

    expect(response.status).toBe(303);
    const updated = await prisma.unit.findUnique({ where: { id: unit.id } });
    expect(updated?.sellPrice).toBeNull();
    expect(updated?.dateSold).toBeNull();
    expect(updated?.salesPerson).toBeNull();
  });

  it("marks an In Stock Unit as Sold when Sell Price and Date Sold are filled", async () => {
    const unit = await seedUnit();

    await submit(unit.id, {
      ...REQUIRED,
      sellPrice: "12500000",
      dateSold: "2026-03-01",
      salesPerson: "BUDI",
    });

    const updated = await prisma.unit.findUnique({ where: { id: unit.id } });
    expect(updated?.sellPrice).toBe(12_500_000);
    expect(updated?.dateSold?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(updated?.salesPerson).toBe("BUDI");
  });

  it("redirects back to the edit page with errors and leaves the Unit unchanged", async () => {
    const unit = await seedUnit();

    const response = await submit(unit.id, {
      brand: "",
      model: "",
      modelYear: "abc",
      licensePlate: "",
      buyPrice: "sepuluh juta",
      dateBought: "01/01/2026",
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain(`/units/${unit.id}/edit`);

    const errors = errorsFrom(response);
    expect(errors.brand).toBeTruthy();
    expect(errors.model).toBeTruthy();
    expect(errors.modelYear).toBeTruthy();
    expect(errors.licensePlate).toBeTruthy();
    expect(errors.buyPrice).toBeTruthy();
    expect(errors.dateBought).toBeTruthy();

    const stored = await prisma.unit.findUnique({ where: { id: unit.id } });
    expect(stored?.brand).toBe("HONDA");
  });

  it("warns but still saves on a duplicate Chassis Serial Number on another Unit", async () => {
    const other = await seedUnit({
      licensePlate: "B 2 BBB",
      chassisSerialNumber: "MH1ABC123",
    });
    const unit = await seedUnit({ licensePlate: "B 3 CCC" });

    const response = await submit(unit.id, {
      ...REQUIRED,
      licensePlate: "B 3 CCC",
      chassisSerialNumber: "MH1ABC123",
    });

    expect(response.headers.get("location")).toContain("warning=chassis");
    const updated = await prisma.unit.findUnique({ where: { id: unit.id } });
    expect(updated?.chassisSerialNumber).toBe("MH1ABC123");
    expect(other.id).not.toBe(unit.id);
  });

  it("does not warn about its own Chassis Serial Number or License Plate", async () => {
    const unit = await seedUnit({
      licensePlate: "B 1 AAA",
      chassisSerialNumber: "MH1ABC123",
    });

    const response = await submit(unit.id, {
      ...REQUIRED,
      licensePlate: "B 1 AAA",
      chassisSerialNumber: "MH1ABC123",
    });

    expect(response.headers.get("location")).not.toContain("warning=");
    expect(await prisma.unit.count()).toBe(1);
  });

  it("redirects unauthenticated posts to the login page and changes nothing", async () => {
    const unit = await seedUnit();

    const response = await submit(unit.id, REQUIRED, false);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/login");
    const stored = await prisma.unit.findUnique({ where: { id: unit.id } });
    expect(stored?.brand).toBe("HONDA");
  });

  it("returns 404 for a missing Unit", async () => {
    const response = await submit(999, REQUIRED);

    expect(response.status).toBe(404);
  });

  it("returns 404 for a non-numeric id", async () => {
    const response = await submit("abc", REQUIRED);

    expect(response.status).toBe(404);
  });
});
