import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
} from "@/lib/session";

const SECRET = "test-secret";

describe("session token", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a freshly created token", async () => {
    const now = Date.now();
    const token = await createSessionToken(now);
    await expect(verifySessionToken(token, now)).resolves.toBe(true);
  });

  it("rejects a tampered token", async () => {
    const now = Date.now();
    const token = await createSessionToken(now);
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    await expect(verifySessionToken(tampered, now)).resolves.toBe(false);
  });

  it("rejects a token signed with a different secret", async () => {
    const now = Date.now();
    const token = await createSessionToken(now);
    await expect(verifySessionToken(token, now, "other-secret")).resolves.toBe(false);
  });

  it("rejects an expired token", async () => {
    const now = Date.now();
    const token = await createSessionToken(now);
    const afterExpiry = now + SESSION_MAX_AGE_SECONDS * 1000 + 1;
    await expect(verifySessionToken(token, afterExpiry)).resolves.toBe(false);
  });

  it("rejects a token at the exact expiry boundary", async () => {
    const now = Date.now();
    const token = await createSessionToken(now);
    const atExpiry = now + SESSION_MAX_AGE_SECONDS * 1000;
    await expect(verifySessionToken(token, atExpiry)).resolves.toBe(false);
  });

  it("rejects missing, empty and malformed tokens", async () => {
    await expect(verifySessionToken(undefined)).resolves.toBe(false);
    await expect(verifySessionToken(null)).resolves.toBe(false);
    await expect(verifySessionToken("")).resolves.toBe(false);
    await expect(verifySessionToken("no-dot")).resolves.toBe(false);
    await expect(verifySessionToken("a.b.c")).resolves.toBe(false);
    await expect(verifySessionToken(".signature")).resolves.toBe(false);
  });
});
