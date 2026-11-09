import { describe, expect, it } from "vitest";
import { dateOnlyWib } from "@/lib/unit-sell";

describe("dateOnlyWib", () => {
  it("returns the WIB calendar date for a UTC instant", () => {
    // 2026-10-31T17:30Z is already November 1st in WIB (UTC+7).
    expect(dateOnlyWib(new Date("2026-10-31T17:30:00.000Z"))).toBe(
      "2026-11-01",
    );
    expect(dateOnlyWib(new Date("2026-11-01T00:00:00.000Z"))).toBe(
      "2026-11-01",
    );
  });

  it("rolls over to the next WIB day after 17:00 UTC", () => {
    expect(dateOnlyWib(new Date("2026-11-01T16:59:00.000Z"))).toBe(
      "2026-11-01",
    );
    expect(dateOnlyWib(new Date("2026-11-01T17:00:00.000Z"))).toBe(
      "2026-11-02",
    );
  });
});
