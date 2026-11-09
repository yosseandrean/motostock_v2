import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import { createTestDb } from "@/test/helpers";

let prisma: PrismaClient;
let POST: (request: Request) => Promise<Response>;

const HEADER =
  "Brand,Model,Year,License Plate,Color,Buy Price,Cost,Sell Price,Date Bought,Date Sold,Sales Person,Name on Registration,Chassis Serial Number,Engine Serial Number,Bought From,Notes";

function fullCsv(): string {
  return readFileSync(path.resolve("inventory_example.csv"), "utf8");
}

async function importRequest(csvText: string, authenticated: boolean): Promise<Request> {
  const form = new FormData();
  form.set("file", new File([csvText], "inventory.csv", { type: "text/csv" }));
  const headers = new Headers();
  if (authenticated) {
    const token = await createSessionToken();
    headers.set("cookie", `${SESSION_COOKIE}=${token}`);
  }
  return new Request("http://localhost/api/import", {
    method: "POST",
    headers,
    body: form,
  });
}

beforeAll(async () => {
  prisma = await createTestDb();
  POST = (await import("@/app/api/import/route")).POST;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.unit.deleteMany();
});

describe("POST /api/import", () => {
  it("imports inventory_example.csv as 535 Units with nothing skipped or rejected", async () => {
    const response = await POST(await importRequest(fullCsv(), true));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("imported=535");
    expect(response.headers.get("location")).toContain("skipped=0");
    expect(response.headers.get("location")).toContain("rejected=0");
    expect(await prisma.unit.count()).toBe(535);
  });

  it("redirects unauthenticated imports to the login page and imports nothing", async () => {
    const response = await POST(await importRequest("Brand\n", false));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/login");
    expect(await prisma.unit.count()).toBe(0);
  });

  it("keeps a quoted field containing a comma intact", async () => {
    const csv = `${HEADER}\n"HONDA","BEAT","2023","B 1 AAA","MERAH","10000000","0","","2026-01-01","","","BONG, ANTON","","","",""`;
    await POST(await importRequest(csv, true));

    const unit = await prisma.unit.findFirst();
    expect(unit?.nameOnRegistration).toBe("BONG, ANTON");
  });

  it("re-importing the same file adds no new Units", async () => {
    await POST(await importRequest(fullCsv(), true));
    const response = await POST(await importRequest(fullCsv(), true));

    expect(response.headers.get("location")).toContain("imported=0");
    expect(response.headers.get("location")).toContain("skipped=535");
    expect(await prisma.unit.count()).toBe(535);
  });

  it("skips a row whose Chassis Serial Number already exists", async () => {
    const row = `"HONDA","BEAT","2023","B 1 AAA","MERAH","10000000","0","","2026-01-01","","","ANNA","MH1ABC123","","",""`;
    const csv = `${HEADER}\n${row}`;

    await POST(await importRequest(csv, true));
    const response = await POST(await importRequest(csv, true));

    expect(response.headers.get("location")).toContain("imported=0");
    expect(response.headers.get("location")).toContain("skipped=1");
    expect(await prisma.unit.count()).toBe(1);
  });

  it("reports rejected rows with reasons", async () => {
    const csv = `${HEADER}\n${'"","BEAT","2023","B 2 BBB","MERAH","10000000","0","","2026-01-01","","","OK2","","","",""'}`;
    const response = await POST(await importRequest(csv, true));

    expect(response.headers.get("location")).toContain("imported=0");
    expect(response.headers.get("location")).toContain("rejected=1");
    const location = new URL(response.headers.get("location")!);
    const rejections = JSON.parse(location.searchParams.get("rejections") ?? "[]");
    expect(rejections).toEqual([{ line: 2, reason: "missing Brand" }]);
    expect(await prisma.unit.count()).toBe(0);
  });
});
