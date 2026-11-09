const INTEGER_RE = /^\d+$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse `YYYY-MM-DD` as a UTC-midnight Date, or null for empty, or "invalid". */
export function parseDateOnly(value: string): Date | null | "invalid" {
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

/** Parse a whole-IDR integer, or null for empty, or "invalid". */
export function parseOptionalInt(value: string): number | null | "invalid" {
  if (value === "") {
    return null;
  }
  return INTEGER_RE.test(value) ? Number(value) : "invalid";
}
