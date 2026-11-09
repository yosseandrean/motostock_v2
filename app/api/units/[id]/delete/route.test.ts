import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
let POST: (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

async function seedUnit() {
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
    },
  });
}

async function submit(
  id: string | number,
  authenticated = true,
): Promise<Response> {
  const headers = new Headers();
  if (authenticated) {
    const token = await createSessionToken();
    headers.set("cookie", `${SESSION_COOKIE}=${token}`);
  }
  const request = new Request(`http://localhost/api/units/${id}/delete`, {
    method: "POST",
    headers,
  });
  return POST(request, { params: Promise.resolve({ id: String(id) }) });
}

beforeAll(async () => {
  prisma = await createTestDb();
  POST = (await import("@/app/api/units/[id]/delete/route")).POST;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.unit.deleteMany();
});

describe("POST /api/units/[id]/delete", () => {
  it("deletes the Unit and redirects to the inventory list", async () => {
    const unit = await seedUnit();

    const response = await submit(unit.id);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/");
    expect(await prisma.unit.count()).toBe(0);
  });

  it("returns 404 for a missing Unit", async () => {
    const response = await submit(999);

    expect(response.status).toBe(404);
    expect(await prisma.unit.count()).toBe(0);
  });

  it("returns 404 for a non-numeric id", async () => {
    const response = await submit("abc");

    expect(response.status).toBe(404);
  });

  it("redirects unauthenticated posts to the login page and deletes nothing", async () => {
    const unit = await seedUnit();

    const response = await submit(unit.id, false);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/login");
    expect(await prisma.unit.count()).toBe(1);
  });
});
