import { describe, expect, it } from "vitest";
import type { DateOnlyParseResult } from "@/lib/calendar";
import {
  ageInDays,
  formatDateDisplay,
  ID_DAYS,
  ID_DAYS_SHORT,
  ID_MONTHS,
  ID_MONTHS_SHORT,
  monthKey,
  monthLabel,
  parseDateOnly,
  WIB_OFFSET_MS,
  wibDateKey,
  wibDateParts,
  wibDayStart,
  wibMidnightUtc,
  wibMonthStart,
} from "@/lib/calendar";

/** Unwrap the valid-Date state; fail loudly on empty or malformed. */
function asDate(value: DateOnlyParseResult): Date {
  if (value === null || value === "invalid") {
    throw new Error("expected a valid Date");
  }
  return value;
}

describe("WIB offset", () => {
  it("is UTC+7", () => {
    expect(WIB_OFFSET_MS).toBe(7 * 60 * 60 * 1000);
  });
});

describe("parseDateOnly", () => {
  it("returns a UTC-midnight Date for a valid YYYY-MM-DD", () => {
    expect(asDate(parseDateOnly("2026-11-01")).toISOString()).toBe(
      "2026-11-01T00:00:00.000Z"
    );
  });

  it("returns null for empty", () => {
    expect(parseDateOnly("")).toBeNull();
  });

  it("returns invalid for malformed or impossible dates", () => {
    expect(parseDateOnly("not-a-date")).toBe("invalid");
    expect(parseDateOnly("2026-1-1")).toBe("invalid");
    expect(parseDateOnly("2026-02-30")).toBe("invalid");
  });
});

describe("WIB day and month boundaries", () => {
  it("builds a WIB-midnight calendar day as a UTC instant", () => {
    expect(wibMidnightUtc(2026, 10, 1).toISOString()).toBe(
      "2026-10-31T17:00:00.000Z"
    );
  });

  it("reads the WIB calendar parts of a UTC instant", () => {
    expect(wibDateParts(new Date("2026-10-31T23:00:00.000Z"))).toEqual({
      year: 2026,
      monthIndex: 10,
      day: 1,
    });
    expect(wibDateParts(new Date("2026-11-01T00:00:00.000Z"))).toEqual({
      year: 2026,
      monthIndex: 10,
      day: 1,
    });
  });

  it("returns the start of the WIB day containing an instant", () => {
    expect(
      wibDayStart(new Date("2026-11-01T10:00:00.000Z")).toISOString()
    ).toBe("2026-10-31T17:00:00.000Z");
    expect(
      wibDayStart(new Date("2026-10-31T23:00:00.000Z")).toISOString()
    ).toBe("2026-10-31T17:00:00.000Z");
  });

  it("returns the start of the WIB month containing an instant", () => {
    expect(
      wibMonthStart(new Date("2026-11-15T10:00:00.000Z")).toISOString()
    ).toBe("2026-10-31T17:00:00.000Z");
    expect(
      wibMonthStart(new Date("2026-10-31T23:00:00.000Z")).toISOString()
    ).toBe("2026-10-31T17:00:00.000Z");
  });
});

describe("formatDateDisplay", () => {
  it("renders a deterministic d/m/yyyy in WIB", () => {
    expect(formatDateDisplay(new Date("2026-11-01T00:00:00.000Z"))).toBe(
      "1/11/2026"
    );
    expect(formatDateDisplay(new Date("2026-01-05T00:00:00.000Z"))).toBe(
      "5/1/2026"
    );
  });

  it("uses the WIB day, not the server's local day", () => {
    expect(formatDateDisplay(new Date("2026-10-31T23:00:00.000Z"))).toBe(
      "1/11/2026"
    );
  });
});

describe("wibDateKey", () => {
  it("renders a deterministic YYYY-MM-DD in WIB", () => {
    expect(wibDateKey(new Date("2026-11-01T00:00:00.000Z"))).toBe("2026-11-01");
    expect(wibDateKey(new Date("2026-01-05T00:00:00.000Z"))).toBe("2026-01-05");
  });

  it("uses the WIB day, not the server's local day", () => {
    expect(wibDateKey(new Date("2026-10-31T23:00:00.000Z"))).toBe("2026-11-01");
  });
});

describe("monthKey", () => {
  it("maps a stored date to its WIB calendar month", () => {
    expect(monthKey(new Date("2026-11-01T00:00:00.000Z"))).toBe("2026-11");
    expect(monthKey(new Date("2026-10-31T23:00:00.000Z"))).toBe("2026-11");
  });
});

describe("Indonesian labels", () => {
  it("has full and short month labels, January first", () => {
    expect(ID_MONTHS[0]).toBe("Januari");
    expect(ID_MONTHS[11]).toBe("Desember");
    expect(ID_MONTHS_SHORT[0]).toBe("Jan");
    expect(ID_MONTHS_SHORT[11]).toBe("Des");
  });

  it("has full and short day labels, Sunday first", () => {
    expect(ID_DAYS[0]).toBe("Minggu");
    expect(ID_DAYS[6]).toBe("Sabtu");
    expect(ID_DAYS_SHORT[0]).toBe("Min");
    expect(ID_DAYS_SHORT[6]).toBe("Sab");
  });

  it("labels a YYYY-MM month key in Indonesian", () => {
    expect(monthLabel("2026-11")).toBe("November 2026");
    expect(monthLabel("2026-01")).toBe("Januari 2026");
  });
});

describe("ageInDays", () => {
  it("counts whole WIB calendar days since Date Bought", () => {
    const dateBought = new Date("2026-02-27T00:00:00.000Z");
    expect(ageInDays(dateBought, new Date("2026-03-01T00:00:00.000Z"))).toBe(2);
    expect(
      ageInDays(
        new Date("2026-03-01T00:00:00.000Z"),
        new Date("2026-03-01T00:00:00.000Z")
      )
    ).toBe(0);
  });

  it("rolls over at the WIB day boundary", () => {
    // 2026-03-01T17:00Z is already 2026-03-02 in WIB.
    const dateBought = new Date("2026-02-28T00:00:00.000Z");
    const now = new Date("2026-03-01T17:00:00.000Z");
    expect(ageInDays(dateBought, now)).toBe(2);
  });
});
