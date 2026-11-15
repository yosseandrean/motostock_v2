/**
 * The Calendar: the single home for date/time knowledge — the WIB (UTC+7)
 * offset, three-state date-only parsing, WIB day and month boundaries, a
 * deterministic `d/m/yyyy` display format, Indonesian month and day labels,
 * and Age in WIB calendar days.
 */

/** WIB (Western Indonesian Time) is UTC+7. */
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A parsed date-only value: a valid Date, null for empty, or "invalid". */
export type DateOnlyParseResult = Date | null | "invalid";

/**
 * Parse a `YYYY-MM-DD` string into one of three states:
 * a UTC-midnight Date when valid, null when empty, or "invalid" when malformed.
 */
export function parseDateOnly(value: string): DateOnlyParseResult {
  if (value === "") {
    return null;
  }
  const match = DATE_RE.exec(value);
  if (!match) {
    return "invalid";
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "invalid";
  }
  return date;
}

/** The WIB calendar parts (year, monthIndex, day) of a UTC instant. */
export function wibDateParts(date: Date): {
  year: number;
  monthIndex: number;
  day: number;
} {
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  return {
    year: wib.getUTCFullYear(),
    monthIndex: wib.getUTCMonth(),
    day: wib.getUTCDate(),
  };
}

/** The UTC instant of a WIB-midnight calendar day (year/monthIndex/day). */
export function wibMidnightUtc(
  year: number,
  monthIndex: number,
  day: number
): Date {
  return new Date(Date.UTC(year, monthIndex, day) - WIB_OFFSET_MS);
}

/** The UTC instant at the start of the WIB day containing `date`. */
export function wibDayStart(date: Date): Date {
  const { year, monthIndex, day } = wibDateParts(date);
  return wibMidnightUtc(year, monthIndex, day);
}

/** The UTC instant at the start of the WIB month containing `date`. */
export function wibMonthStart(date: Date): Date {
  const { year, monthIndex } = wibDateParts(date);
  return wibMidnightUtc(year, monthIndex, 1);
}

/** Format a date as `d/m/yyyy` in WIB, independent of the server's locale. */
export function formatDateDisplay(date: Date): string {
  const { year, monthIndex, day } = wibDateParts(date);
  return `${day}/${monthIndex + 1}/${year}`;
}

/** The WIB calendar date of an instant, as a sortable `YYYY-MM-DD` key. */
export function wibDateKey(date: Date): string {
  const { year, monthIndex, day } = wibDateParts(date);
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Indonesian month names, January first. */
export const ID_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

/** Indonesian short month names, January first. */
export const ID_MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

/** Indonesian day names, Sunday first. */
export const ID_DAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

/** Indonesian short day names, Sunday first. */
export const ID_DAYS_SHORT = [
  "Min",
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab",
] as const;

/** The Indonesian label for a `YYYY-MM` month key. */
export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${ID_MONTHS[month - 1]} ${year}`;
}

/** Age in whole WIB calendar days since Date Bought. */
export function ageInDays(dateBought: Date, now: Date): number {
  const start = wibDayStart(dateBought).getTime();
  const end = wibDayStart(now).getTime();
  return Math.floor((end - start) / DAY_MS);
}
