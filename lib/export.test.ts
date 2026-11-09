import { describe, expect, it } from "vitest";
import { exportCsvFilename } from "@/lib/export";

describe("exportCsvFilename", () => {
  it("uses the WIB calendar date of the export instant", () => {
    // 2026-11-08T17:30Z is already 2026-11-09 00:30 in WIB (UTC+7).
    expect(exportCsvFilename(new Date("2026-11-08T17:30:00.000Z"))).toBe(
      "inventory-2026-11-09.csv",
    );
  });

  it("zero-pads single-digit months and days", () => {
    // 2026-01-01T00:00Z is 2026-01-01 07:00 in WIB.
    expect(exportCsvFilename(new Date("2026-01-01T00:00:00.000Z"))).toBe(
      "inventory-2026-01-01.csv",
    );
  });
});
