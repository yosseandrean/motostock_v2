import { describe, expect, it } from "vitest";
import { formatIDR, formatPercent } from "@/lib/format";

describe("formatIDR", () => {
  it("formats whole rupiah with the Rp symbol and thousands separators", () => {
    const formatted = formatIDR(9000000).replace(/\s/g, " ");
    expect(formatted).toContain("Rp");
    expect(formatted).toContain("9.000.000");
  });

  it("formats zero as Rp 0", () => {
    expect(formatIDR(0).replace(/\s/g, " ")).toBe("Rp 0");
  });
});

describe("formatPercent", () => {
  it("formats a fraction as an Indonesian percentage", () => {
    expect(formatPercent(0.234)).toBe("23,4%");
    expect(formatPercent(-0.2233)).toBe("-22,3%");
  });
});
