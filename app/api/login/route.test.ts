import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/login/route";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, verifySessionToken } from "@/lib/session";

function loginRequest(password: string): Request {
  return new Request("http://localhost/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password }),
  });
}

describe("POST /api/login", () => {
  beforeEach(() => {
    vi.stubEnv("SHARED_PASSWORD", "rahasia");
    vi.stubEnv("SESSION_SECRET", "test-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects to the inventory page and sets a 30-day session cookie on success", async () => {
    const response = await POST(loginRequest("rahasia"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/");

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie.toLowerCase()).toContain(`max-age=${SESSION_MAX_AGE_SECONDS}`);
    expect(setCookie.toLowerCase()).toContain("httponly");

    const token = setCookie.split(";")[0].split("=").slice(1).join("=");
    await expect(verifySessionToken(token)).resolves.toBe(true);
  });

  it("redirects back to login with an error and sets no cookie on a wrong password", async () => {
    const response = await POST(loginRequest("salah"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/login?error=1");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
