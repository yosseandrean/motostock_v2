/**
 * The bridge between the 16-column inventory CSV and the Unit record.
 *
 * The column order is fixed and matches `inventory_example.csv`; export must
 * reproduce it exactly so that export → re-import is a no-op.
 */

export const CSV_HEADERS = [
  "Brand",
  "Model",
  "Year",
  "License Plate",
  "Color",
  "Buy Price",
  "Cost",
  "Sell Price",
  "Date Bought",
  "Date Sold",
  "Sales Person",
  "Name on Registration",
  "Chassis Serial Number",
  "Engine Serial Number",
  "Bought From",
  "Notes",
] as const;

export const CSV_COLUMN_COUNT = CSV_HEADERS.length;

/** A Unit as the 16 fields shared by the Prisma model and CSV rows. */
export type UnitRecord = {
  brand: string;
  model: string;
  modelYear: string;
  licensePlate: string;
  color: string;
  buyPrice: number;
  cost: number;
  sellPrice: number | null;
  dateBought: Date;
  dateSold: Date | null;
  salesPerson: string | null;
  nameOnRegistration: string | null;
  chassisSerialNumber: string | null;
  engineSerialNumber: string | null;
  boughtFrom: string | null;
  notes: string | null;
};

/** Trim and collapse runs of whitespace into a single space. */
export function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Safe normalization for fields that are upper-cased by policy. */
export function normalizeUpperCase(value: string): string {
  return collapseWhitespace(value).toUpperCase();
}

/** `YYYY-MM-DD` for a date, independent of the server's local timezone. */
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Serialize a Unit record to the 16 CSV columns in the original order. */
export function unitRecordToCsvRow(record: UnitRecord): string[] {
  return [
    record.brand,
    record.model,
    record.modelYear,
    record.licensePlate,
    record.color,
    String(record.buyPrice),
    String(record.cost),
    record.sellPrice === null ? "" : String(record.sellPrice),
    formatDateOnly(record.dateBought),
    record.dateSold === null ? "" : formatDateOnly(record.dateSold),
    record.salesPerson ?? "",
    record.nameOnRegistration ?? "",
    record.chassisSerialNumber ?? "",
    record.engineSerialNumber ?? "",
    record.boughtFrom ?? "",
    record.notes ?? "",
  ];
}

export type ImportRowResult =
  | { ok: true; data: UnitRecord }
  | { ok: false; reason: string };

type IntResult = { ok: true; value: number } | { ok: false; reason: string };

function parseRequiredInt(value: string, label: string): IntResult {
  if (value === "") {
    return { ok: false, reason: `missing ${label}` };
  }
  if (!/^\d+$/.test(value)) {
    return { ok: false, reason: `invalid ${label}` };
  }
  return { ok: true, value: Number(value) };
}

function parseOptionalInt(
  value: string,
  label: string,
): { ok: true; value: number | null } | { ok: false; reason: string } {
  if (value === "") {
    return { ok: true, value: null };
  }
  if (!/^\d+$/.test(value)) {
    return { ok: false, reason: `invalid ${label}` };
  }
  return { ok: true, value: Number(value) };
}

function parseDate(
  value: string,
  label: string,
): { ok: true; value: Date | null } | { ok: false; reason: string } {
  if (value === "") {
    return { ok: true, value: null };
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return { ok: false, reason: `invalid ${label}` };
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
    return { ok: false, reason: `invalid ${label}` };
  }
  return { ok: true, value: date };
}

/** Parse and normalize one raw CSV row into a Unit record, or a rejection. */
export function parseImportRow(raw: string[]): ImportRowResult {
  if (raw.length !== CSV_COLUMN_COUNT) {
    return {
      ok: false,
      reason: `expected ${CSV_COLUMN_COUNT} columns, got ${raw.length}`,
    };
  }

  const brand = normalizeUpperCase(raw[0]);
  const model = normalizeUpperCase(raw[1]);
  const modelYear = collapseWhitespace(raw[2]);
  const licensePlate = collapseWhitespace(raw[3]);
  const color = normalizeUpperCase(raw[4]);
  const buyPriceRaw = collapseWhitespace(raw[5]);
  const costRaw = collapseWhitespace(raw[6]);
  const sellPriceRaw = collapseWhitespace(raw[7]);
  const dateBoughtRaw = collapseWhitespace(raw[8]);
  const dateSoldRaw = collapseWhitespace(raw[9]);
  const salesPerson = normalizeUpperCase(raw[10]);
  const nameOnRegistration = collapseWhitespace(raw[11]);
  const chassisSerialNumber = collapseWhitespace(raw[12]);
  const engineSerialNumber = collapseWhitespace(raw[13]);
  const boughtFrom = collapseWhitespace(raw[14]);
  const notes = collapseWhitespace(raw[15]);

  if (brand === "") {
    return { ok: false, reason: "missing Brand" };
  }
  if (model === "") {
    return { ok: false, reason: "missing Model" };
  }
  if (modelYear === "") {
    return { ok: false, reason: "missing Model Year" };
  }
  if (licensePlate === "") {
    return { ok: false, reason: "missing License Plate" };
  }
  if (dateBoughtRaw === "") {
    return { ok: false, reason: "missing Date Bought" };
  }

  const buyPrice = parseRequiredInt(buyPriceRaw, "Buy Price");
  if (!buyPrice.ok) {
    return { ok: false, reason: buyPrice.reason };
  }
  const cost = parseOptionalInt(costRaw, "Cost");
  if (!cost.ok) {
    return { ok: false, reason: cost.reason };
  }
  const sellPrice = parseOptionalInt(sellPriceRaw, "Sell Price");
  if (!sellPrice.ok) {
    return { ok: false, reason: sellPrice.reason };
  }
  const dateBought = parseDate(dateBoughtRaw, "Date Bought");
  if (!dateBought.ok || dateBought.value === null) {
    return dateBought.ok
      ? { ok: false, reason: "missing Date Bought" }
      : { ok: false, reason: dateBought.reason };
  }
  const dateSold = parseDate(dateSoldRaw, "Date Sold");
  if (!dateSold.ok) {
    return { ok: false, reason: dateSold.reason };
  }

  const optional = (value: string): string | null => (value === "" ? null : value);

  return {
    ok: true,
    data: {
      brand,
      model,
      modelYear,
      licensePlate,
      color,
      buyPrice: buyPrice.value,
      cost: cost.value ?? 0,
      sellPrice: sellPrice.value,
      dateBought: dateBought.value,
      dateSold: dateSold.value,
      salesPerson: optional(salesPerson),
      nameOnRegistration: optional(nameOnRegistration),
      chassisSerialNumber: optional(chassisSerialNumber),
      engineSerialNumber: optional(engineSerialNumber),
      boughtFrom: optional(boughtFrom),
      notes: optional(notes),
    },
  };
}
