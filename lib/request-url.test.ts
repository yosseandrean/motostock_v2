import { describe, expect, it } from "vitest";
import { externalOrigin } from "@/lib/request-url";

describe("externalOrigin", () => {
  it("prefers the forwarded scheme and host when both are present", () => {
    const request = new Request("https://0.0.0.0:3000/api/login", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "stok.example.com",
      },
    });

    expect(externalOrigin(request)).toBe("https://stok.example.com");
  });

  it("falls back to the request URL origin without forwarded headers", () => {
    const request = new Request("http://localhost/api/login");

    expect(externalOrigin(request)).toBe("http://localhost");
  });

  it("falls back to the request URL origin when only the proto is forwarded", () => {
    const request = new Request("http://localhost/api/login", {
      headers: { "x-forwarded-proto": "https" },
    });

    expect(externalOrigin(request)).toBe("http://localhost");
  });
});
