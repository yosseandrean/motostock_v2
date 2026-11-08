import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifySharedPassword } from "@/lib/password";

describe("verifySharedPassword", () => {
  beforeEach(() => {
    vi.stubEnv("SHARED_PASSWORD", "rahasia");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts the configured shared password", () => {
    expect(verifySharedPassword("rahasia")).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(verifySharedPassword("salah")).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(verifySharedPassword("")).toBe(false);
  });
});
