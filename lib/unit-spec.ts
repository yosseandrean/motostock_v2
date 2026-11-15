/**
 * The Unit record spec: the single 16-entry field list that defines the
 * canonical Unit record and its CSV converters.
 *
 * Each entry is (field key, CSV header, user-facing label, type):
 *
 * - `key` names the Unit record property (canonical English, camelCase);
 * - `csvHeader` names the export/import column (matches the source spreadsheet);
 * - `label` is the Indonesian form label (`GLOSSARY.md`);
 * - `type` drives both the record's TypeScript type and the CSV ⇄ record
 *   conversion.
 *
 * The `type` vocabulary and what it means for an empty/absent raw value:
 *
 * | type                  | TS type       | empty →          |
 * | --------------------- | ------------- | ---------------- |
 * | `text-required`       | string        | error (missing)  |
 * | `text-required-upper` | string        | error (missing)  |
 * | `text`                | string        | "" (allowed)     |
 * | `text-upper`          | string        | "" (allowed)     |
 * | `text-null`           | string \| null| null             |
 * | `text-null-upper`     | string \| null| null             |
 * | `int`                 | number        | error (missing)  |
 * | `int-zero`            | number        | 0                |
 * | `int-null`            | number \| null| null             |
 * | `date`                | Date          | error (missing)  |
 * | `date-null`           | Date \| null  | null             |
 *
 * The `-upper` text types are normalized to uppercase; all text is
 * whitespace-collapsed. Nothing imports this module yet (see #46); it is the
 * foundation the CSV and form handling will derive from.
 */

export type UnitFieldType =
  | "text-required"
  | "text-required-upper"
  | "text"
  | "text-upper"
  | "text-null"
  | "text-null-upper"
  | "int"
  | "int-zero"
  | "int-null"
  | "date"
  | "date-null";

export type UnitField = {
  key: UnitFieldKey;
  csvHeader: string;
  label: string;
  type: UnitFieldType;
};

export const UNIT_FIELDS = [
  {
    key: "brand",
    csvHeader: "Brand",
    label: "Merek",
    type: "text-required-upper",
  },
  {
    key: "model",
    csvHeader: "Model",
    label: "Model",
    type: "text-required-upper",
  },
  {
    key: "modelYear",
    csvHeader: "Year",
    label: "Tahun",
    type: "text-required",
  },
  {
    key: "licensePlate",
    csvHeader: "License Plate",
    label: "Plat",
    type: "text-required",
  },
  { key: "color", csvHeader: "Color", label: "Warna", type: "text-upper" },
  { key: "buyPrice", csvHeader: "Buy Price", label: "Harga Beli", type: "int" },
  { key: "cost", csvHeader: "Cost", label: "Biaya", type: "int-zero" },
  {
    key: "sellPrice",
    csvHeader: "Sell Price",
    label: "Harga Jual",
    type: "int-null",
  },
  {
    key: "dateBought",
    csvHeader: "Date Bought",
    label: "Tanggal Beli",
    type: "date",
  },
  {
    key: "dateSold",
    csvHeader: "Date Sold",
    label: "Tanggal Jual",
    type: "date-null",
  },
  {
    key: "salesPerson",
    csvHeader: "Sales Person",
    label: "Sales Person",
    type: "text-null-upper",
  },
  {
    key: "nameOnRegistration",
    csvHeader: "Name on Registration",
    label: "Nama di STNK",
    type: "text-null",
  },
  {
    key: "chassisSerialNumber",
    csvHeader: "Chassis Serial Number",
    label: "Nomor Rangka",
    type: "text-null",
  },
  {
    key: "engineSerialNumber",
    csvHeader: "Engine Serial Number",
    label: "Nomor Mesin",
    type: "text-null",
  },
  {
    key: "boughtFrom",
    csvHeader: "Bought From",
    label: "Dibeli Dari",
    type: "text-null",
  },
  { key: "notes", csvHeader: "Notes", label: "Catatan", type: "text-null" },
] as const;

export type UnitFieldKey = (typeof UNIT_FIELDS)[number]["key"];

type FieldValue<Type extends UnitFieldType> = Type extends
  "text-required" | "text-required-upper" | "text" | "text-upper"
  ? string
  : Type extends "text-null" | "text-null-upper"
    ? string | null
    : Type extends "int" | "int-zero"
      ? number
      : Type extends "int-null"
        ? number | null
        : Type extends "date"
          ? Date
          : Type extends "date-null"
            ? Date | null
            : never;

/** The canonical Unit record, derived field-by-field from `UNIT_FIELDS`. */
export type UnitRecord = {
  [F in (typeof UNIT_FIELDS)[number] as F["key"]]: FieldValue<F["type"]>;
};

/** The 16 CSV headers in order, derived from the field spec. */
export const CSV_HEADERS: string[] = UNIT_FIELDS.map(
  (field) => field.csvHeader
);

export const CSV_COLUMN_COUNT = CSV_HEADERS.length;

const INT_RE = /^\d+$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Trim and collapse runs of whitespace into a single space. */
export function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Safe normalization for fields that are upper-cased by policy. */
export function normalizeUpperCase(value: string): string {
  return collapseWhitespace(value).toUpperCase();
}

function isUpper(type: UnitFieldType): boolean {
  return (
    type === "text-required-upper" ||
    type === "text-upper" ||
    type === "text-null-upper"
  );
}

function normalizeText(value: string, type: UnitFieldType): string {
  return isUpper(type) ? value.toUpperCase() : value;
}

/** The canonical English field name, derived from the camelCase key. */
function fieldLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^[a-z]/, (char) => char.toUpperCase());
}

/** `YYYY-MM-DD` for a date, independent of the server's local timezone. */
function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(
  raw: string,
  label: string
): { ok: true; value: Date } | { ok: false; reason: string } {
  const match = DATE_RE.exec(raw);
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

function parseField(
  field: UnitField,
  raw: string
):
  | { ok: true; value: string | number | Date | null }
  | { ok: false; reason: string } {
  const collapsed = collapseWhitespace(raw);
  const label = fieldLabel(field.key);

  switch (field.type) {
    case "text-required":
    case "text-required-upper": {
      const value = normalizeText(collapsed, field.type);
      if (value === "") {
        return { ok: false, reason: `missing ${label}` };
      }
      return { ok: true, value };
    }
    case "text":
    case "text-upper":
      return { ok: true, value: normalizeText(collapsed, field.type) };
    case "text-null":
    case "text-null-upper":
      return {
        ok: true,
        value: collapsed === "" ? null : normalizeText(collapsed, field.type),
      };
    case "int":
      if (collapsed === "") {
        return { ok: false, reason: `missing ${label}` };
      }
      if (!INT_RE.test(collapsed)) {
        return { ok: false, reason: `invalid ${label}` };
      }
      return { ok: true, value: Number(collapsed) };
    case "int-zero":
      if (collapsed === "") {
        return { ok: true, value: 0 };
      }
      if (!INT_RE.test(collapsed)) {
        return { ok: false, reason: `invalid ${label}` };
      }
      return { ok: true, value: Number(collapsed) };
    case "int-null":
      if (collapsed === "") {
        return { ok: true, value: null };
      }
      if (!INT_RE.test(collapsed)) {
        return { ok: false, reason: `invalid ${label}` };
      }
      return { ok: true, value: Number(collapsed) };
    case "date":
      if (collapsed === "") {
        return { ok: false, reason: `missing ${label}` };
      }
      return parseDate(collapsed, label);
    case "date-null":
      if (collapsed === "") {
        return { ok: true, value: null };
      }
      return parseDate(collapsed, label);
  }
}

export type ImportRowResult =
  { ok: true; data: UnitRecord } | { ok: false; reason: string };

/** Serialize a Unit record to the 16 CSV columns in the original order. */
export function unitRecordToCsvRow(record: UnitRecord): string[] {
  return UNIT_FIELDS.map((field) => {
    const value = record[field.key] as string | number | Date | null;
    switch (field.type) {
      case "date":
        return formatDateOnly(value as Date);
      case "date-null":
        return value === null ? "" : formatDateOnly(value as Date);
      case "int":
      case "int-zero":
        return String(value as number);
      case "int-null":
        return value === null ? "" : String(value as number);
      default:
        return value === null ? "" : String(value);
    }
  });
}

/** Parse and normalize one raw CSV row into a Unit record, or a rejection. */
export function parseImportRow(raw: string[]): ImportRowResult {
  if (raw.length !== CSV_COLUMN_COUNT) {
    return {
      ok: false,
      reason: `expected ${CSV_COLUMN_COUNT} columns, got ${raw.length}`,
    };
  }

  const record: Record<string, string | number | Date | null> = {};
  for (let i = 0; i < UNIT_FIELDS.length; i++) {
    const field = UNIT_FIELDS[i];
    const parsed = parseField(field, raw[i]);
    if (!parsed.ok) {
      return { ok: false, reason: parsed.reason };
    }
    record[field.key] = parsed.value;
  }

  return { ok: true, data: record as unknown as UnitRecord };
}
