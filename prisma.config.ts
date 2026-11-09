import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Resolved relative to this config file (the repo root), unlike Prisma 6
    // where the schema's `url` was resolved relative to `prisma/`. The `.env`
    // value therefore points at `prisma/dev.db` explicitly. `prisma generate`
    // does not connect, so the fallback only satisfies config validation when
    // no URL is set (e.g. the Docker build stage, where `.env` is excluded).
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
