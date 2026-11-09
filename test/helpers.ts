import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@/lib/generated/prisma/client";

/** A fresh SQLite file URL for a throwaway test database. */
export function tempDatabaseUrl(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "motostock-test-"));
  return `file:${path.join(dir, "test.db")}`;
}

/** The canonical schema DDL, read from the committed migration. */
export function migrationSql(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return readFileSync(
    path.resolve(here, "../prisma/migrations/20261108111942_init/migration.sql"),
    "utf8",
  );
}

/**
 * Point the app's global Prisma singleton at a throwaway database and create
 * the schema. Call this in `beforeAll`, before importing any route handler.
 */
export async function createTestDb(): Promise<PrismaClient> {
  process.env.DATABASE_URL = tempDatabaseUrl();
  const { prisma } = await import("@/lib/prisma");
  await prisma.$executeRawUnsafe(migrationSql());
  return prisma;
}
