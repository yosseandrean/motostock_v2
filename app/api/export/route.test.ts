import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
let GET: (request: Request) => Promise<Response>;
let POST: (request: Request) => Promise<Response>;

const HEADER =
  "Brand,Model,Year,License Plate,Color,Buy Price,Cost,Sell Price,Date Bought,Date Sold,Sales Person,Name on Registration,Chassis Serial Number,Engine Serial Number,Bought From,Notes";

function fullCsv(): string {
  return readFileSync(path.resolve("inventory_example.csv"), "utf8");
}

async function exportRequest(authenticated: boolean): Promise<Request> {
  const headers = new Headers();
  if (authenticated) {
    const token = await createSessionToken();
    headers.set("cookie", `${SESSION_COOKIE}=${token}`);
  }
  return new Request("http://localhost/api/export", { headers });
}

async function importCsv(csvText: string): Promise<void> {
  const form = new FormData();
  form.set("file", new File([csvText], "inventory.csv", { type: "text/csv" }));
  const token = await createSessionToken();
  const request = new Request("http://localhost/api/import", {
    method: "POST",
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
    body: form,
  });
  await POST(request);
}

beforeAll(async () => {
  prisma = await createTestDb();
  GET = (await import("@/app/api/export/route")).GET;
  POST = (await import("@/app/api/import/route")).POST;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.unit.deleteMany();
});

describe("GET /api/export", () => {
  it("redirects unauthenticated exports to the login page", async () => {
    const response = await GET(await exportRequest(false));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("exports the 16 original columns in the original order", async () => {
    await prisma.unit.create({
      data: {
        brand: "HONDA",
        model: "BEAT",
        modelYear: "2023",
        licensePlate: "B 1 AAA",
        color: "MERAH",
        buyPrice: 10000000,
        cost: 0,
        sellPrice: null,
        dateBought: new Date("2026-01-01T00:00:00.000Z"),
        dateSold: null,
      },
    });

    const response = await GET(await exportRequest(true));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    const lines = (await response.text()).trim().split("\n");
    expect(lines[0]).toBe(HEADER);
    expect(lines).toHaveLength(2);
  });

  it("round-trips: exporting then re-importing changes nothing", async () => {
    await importCsv(fullCsv());

    const exported = await (await GET(await exportRequest(true))).text();
    expect(exported.trim().split("\n")).toHaveLength(536); // header + 535 Units

    // Clear the table, then re-import the export: nothing should be added.
    await prisma.unit.deleteMany();
    const form = new FormData();
    form.set("file", new File([exported], "export.csv", { type: "text/csv" }));
    const token = await createSessionToken();
    const reimport = await POST(
      new Request("http://localhost/api/import", {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE}=${token}` },
        body: form,
      }),
    );

    expect(reimport.headers.get("location")).toContain("imported=535");
    expect(reimport.headers.get("location")).toContain("skipped=0");
    expect(await prisma.unit.count()).toBe(535);

    const reexported = await (await GET(await exportRequest(true))).text();
    expect(reexported).toBe(exported);
  });
});
